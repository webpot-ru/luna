#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lo_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_lo_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-lo.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "LO";
const BATCH_ID = "lo_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?]$/u;
const LAO_RE = /\p{Script=Lao}/u;
const LATIN_RE = /[A-Za-z]/u;
const LAO_TOKEN_SPACE_RE = /\p{Script=Lao}\s+\p{Script=Lao}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const LO_TRANSLATIONS_TSV = `source_headword	LO	example_LO
machine	ເຄື່ອງຈັກ;ເຄື່ອງມື	ເຄື່ອງນີ້ເຮັດກາເຟ.
magazine	ວາລະສານ	ນາງອ່ານວາລະສານດົນຕີ.
main	ຫຼັກ;ສຳຄັນ	ນີ້ແມ່ນປະຕູຫຼັກ.
make	ເຮັດ;ສ້າງ	ຂ້ອຍເຮັດອາຫານທ່ຽງຢູ່ເຮືອນ.
man	ຜູ້ຊາຍ;ຄົນຜູ້ຊາຍ	ຜູ້ຊາຍນັ້ນແມ່ນຄູຂອງຂ້ອຍ.
many	ຫຼາຍ	ນັກຮຽນຫຼາຍຄົນຢູ່ທີ່ນີ້.
map	ແຜນທີ່	ເບິ່ງແຜນທີ່.
March	ເດືອນມີນາ	ວັນເກີດຂ້ອຍຢູ່ເດືອນມີນາ.
market	ຕະຫຼາດ;ຕະຫຼາດການຄ້າ	ພວກເຮົາຊື້ໝາກໄມ້ຢູ່ຕະຫຼາດ.
married	ແຕ່ງງານແລ້ວ;ມີຄອບຄົວ	ເອື້ອຍຂ້ອຍແຕ່ງງານແລ້ວ.
May	ເດືອນພຶດສະພາ	ໂຮງຮຽນຈົບໃນເດືອນພຶດສະພາ.
maybe	ບາງທີ;ອາດຈະ	ບາງທີຝົນຈະຕົກ.
me	ຂ້ອຍ;ຂ້ອຍເອງ	ກະລຸນາຊ່ວຍຂ້ອຍ.
meal	ອາຫານ;ມື້ອາຫານ	ອາຫານນີ້ຮ້ອນ.
mean	ໝາຍຄວາມວ່າ;ມີຄວາມໝາຍ	ປ້າຍນີ້ໝາຍຄວາມວ່າຫຍັງ?
meaning	ຄວາມໝາຍ	ຄວາມໝາຍແມ່ນຫຍັງ?
meat	ຊີ້ນ	ຂ້ອຍກິນຊີ້ນຕອນຄ່ຳ.
meet	ພົບ;ພົບກັນ	ພວກເຮົາພົບກັນຫຼັງຮຽນ.
meeting	ການປະຊຸມ	ການປະຊຸມເລີ່ມດຽວນີ້.
member	ສະມາຊິກ	ນາງເປັນສະມາຊິກສະໂມສອນ.
menu	ເມນູ;ລາຍການອາຫານ	ກະລຸນາອ່ານເມນູ.
message	ຂໍ້ຄວາມ;ສານ	ຂ້ອຍສົ່ງຂໍ້ຄວາມສັ້ນ.
metre	ແມັດ	ຍ່າງໄປຂ້າງໜ້າໜຶ່ງແມັດ.
midnight	ທ່ຽງຄືນ	ລົດໄຟອອກຕອນທ່ຽງຄືນ.
mile	ໄມລ໌	ພວກເຮົາຍ່າງໜຶ່ງໄມລ໌.
milk	ນົມ	ຂ້ອຍດື່ມນົມກັບອາຫານເຊົ້າ.
million	ລ້ານ	ຄົນໜຶ່ງລ້ານຢູ່ທີ່ນີ້.
minute1	ນາທີ	ກະລຸນາລໍຖ້າໜຶ່ງນາທີ.
miss	ຄິດຮອດ;ພາດ	ຂ້ອຍຄິດຮອດໂຮງຮຽນເກົ່າ.
mistake	ຄວາມຜິດພາດ	ຄຳຕອບນີ້ມີຄວາມຜິດພາດ.
model	ແບບຈຳລອງ;ຕົວຢ່າງ	ນີ້ແມ່ນແບບຈຳລອງນ້ອຍ.
modern	ທັນສະໄໝ	ເຮືອນຄົວທັນສະໄໝ.
moment	ຄູ່ໜຶ່ງ;ຊ່ວງສັ້ນ	ກະລຸນາລໍຖ້າຄູ່ໜຶ່ງ.
Monday	ວັນຈັນ	ພວກເຮົາເລີ່ມວຽກວັນຈັນ.
money	ເງິນ	ຂ້ອຍຕ້ອງການເງິນບາງສ່ວນ.
month	ເດືອນ	ເດືອນມິຖຸນາເປັນເດືອນອົບອຸ່ນ.
more	ຫຼາຍກວ່າ;ເພີ່ມອີກ	ຂ້ອຍຕ້ອງການເວລາເພີ່ມ.
morning	ຕອນເຊົ້າ	ຂ້ອຍຮຽນຕອນເຊົ້າ.
most	ສ່ວນໃຫຍ່;ຫຼາຍທີ່ສຸດ	ນັກຮຽນສ່ວນໃຫຍ່ມັກດົນຕີ.
mother	ແມ່	ແມ່ຂ້ອຍເຮັດວຽກມື້ນີ້.
mountain	ພູ	ພູນີ້ສູງ.
mouse	ໜູ	ໜູໂຕໜຶ່ງຢູ່ໃຕ້ຕັ່ງ.
mouth	ປາກ	ກະລຸນາເປີດປາກຂອງເຈົ້າ.
move	ຍ້າຍ;ເຄື່ອນໄຫວ	ຍ້າຍຕັ່ງມາທີ່ນີ້.
movie	ຮູບເງົາ	ພວກເຮົາເບິ່ງຮູບເງົາຄືນນີ້.
much	ຫຼາຍ;ເທົ່າໃດ	ນີ້ລາຄາເທົ່າໃດ?
mum	ແມ່	ແມ່ຂ້ອຍຢູ່ເຮືອນ.
museum	ພິພິທະພັນ	ພິພິທະພັນເປີດຕອນສິບໂມງ.
music	ດົນຕີ	ຂ້ອຍຟັງດົນຕີ.
must modal	ຕ້ອງ;ຈຳເປັນ	ເຈົ້າຕ້ອງຢຸດທີ່ນີ້.
my	ຂອງຂ້ອຍ	ນີ້ແມ່ນປຶ້ມຂອງຂ້ອຍ.
name	ຊື່;ຕັ້ງຊື່	ຂຽນຊື່ຂອງເຈົ້າທີ່ນີ້.
natural	ທຳມະຊາດ	ນ້ຳໝາກໄມ້ນີ້ທຳມະຊາດ.
near	ໃກ້;ຢູ່ໃກ້	ທະນາຄານຢູ່ໃກ້ທີ່ນີ້.
need	ຕ້ອງການ;ຄວາມຈຳເປັນ	ຂ້ອຍຕ້ອງການປາກກາ.
negative	ລົບ;ບໍ່ດີ	ຄຳຕອບນີ້ເປັນລົບ.
neighbour	ເພື່ອນບ້ານ	ເພື່ອນບ້ານຂ້ອຍເປັນມິດ.
never	ບໍ່ເຄີຍ	ຂ້ອຍບໍ່ເຄີຍດື່ມກາເຟ.
new	ໃໝ່	ໂທລະສັບນີ້ໃໝ່.
news	ຂ່າວ	ຂ່າວມື້ນີ້ດີ.
newspaper	ໜັງສືພິມ	ລາວອ່ານໜັງສືພິມ.
next	ຕໍ່ໄປ;ຖັດໄປ	ລົດເມຖັດໄປມາຊ້າ.
next to	ຢູ່ຂ້າງ;ຕິດກັບ	ນັ່ງຂ້າງຂ້ອຍ.
nice	ດີ;ງາມ	ຫ້ອງນີ້ງາມ.
night	ກາງຄືນ	ຂ້ອຍນອນກາງຄືນ.
nine	ເກົ້າ	ນັກຮຽນເກົ້າຄົນຢູ່ທີ່ນີ້.
nineteen	ສິບເກົ້າ	ນາງອາຍຸສິບເກົ້າປີ.
ninety	ເກົ້າສິບ	ພໍ່ເຖົ້າຂ້ອຍອາຍຸເກົ້າສິບປີ.
no	ບໍ່;ບໍ່ມີ	ບໍ່ຂອບໃຈ.
no one	ບໍ່ມີໃຜ	ບໍ່ມີໃຜຢູ່ໃນຫ້ອງ.
nobody	ບໍ່ມີໃຜ	ບໍ່ມີໃຜຢູ່ເຮືອນ.
north	ທິດເໜືອ	ສະຖານີຢູ່ທາງເໜືອຂອງທີ່ນີ້.
nose	ດັງ	ດັງຂ້ອຍເຢັນ.
not	ບໍ່	ຂ້ອຍບໍ່ເມື່ອຍ.
note	ບັນທຶກ	ຂຽນບັນທຶກດຽວນີ້.
nothing	ບໍ່ມີຫຍັງ	ບໍ່ມີຫຍັງຢູ່ໃນກ່ອງ.
November	ເດືອນພະຈິກ	ຫຼັກສູດຂ້ອຍເລີ່ມໃນເດືອນພະຈິກ.
now	ດຽວນີ້;ຕອນນີ້	ມາທີ່ນີ້ດຽວນີ້.
number	ເລກ;ຈຳນວນ	ຂຽນເລກທີ່ນີ້.
nurse	ພະຍາບານ	ພະຍາບານໃຈດີ.
object	ສິ່ງຂອງ;ວັດຖຸ	ວາງສິ່ງຂອງໄວ້ເທິງໂຕະ.
o’clock	ໂມງພໍດີ	ຫ້ອງຮຽນເລີ່ມເກົ້າໂມງພໍດີ.
October	ເດືອນຕຸລາ	ພວກເຮົາເດີນທາງໃນເດືອນຕຸລາ.
of	ຂອງ;ແຫ່ງ	ນີ້ແມ່ນຈອກຊາ.
off	ປິດ;ບໍ່ເປີດ	ປິດໄຟ.
office	ຫ້ອງການ	ຫ້ອງການຂ້ອຍນ້ອຍ.
often	ເລື້ອຍໆ	ຂ້ອຍມັກຍ່າງໄປໂຮງຮຽນເລື້ອຍໆ.
oh	ໂອ້	ໂອ້ຂ້ອຍເຂົ້າໃຈແລ້ວ.
OK	ຕົກລົງ;ໄດ້	ນີ້ໄດ້ບໍ?
old	ເກົ່າ;ແກ່	ເຮືອນນີ້ເກົ່າ.
on	ເທິງ;ຢູ່ເທິງ	ປຶ້ມຢູ່ເທິງໂຕະ.
once	ໜຶ່ງຄັ້ງ	ຂ້ອຍໂທຫາໜຶ່ງຄັ້ງຕໍ່ອາທິດ.
one	ໜຶ່ງ	ຂ້ອຍມີເອື້ອຍໜຶ່ງຄົນ.
onion	ຫົວຜັກບົ່ວ	ຕັດຫົວຜັກບົ່ວໜຶ່ງຫົວ.
online	ອອນລາຍ	ຂ້ອຍຮຽນອອນລາຍ.
only	ພຽງແຕ່;ເທົ່ານັ້ນ	ຂ້ອຍມີກະເປົາພຽງໃບດຽວ.
open	ເປີດ	ກະລຸນາເປີດປ່ອງຢ້ຽມ.
opinion	ຄວາມເຫັນ	ຄວາມເຫັນຂອງເຈົ້າແມ່ນຫຍັງ?
opposite	ກົງກັນຂ້າມ;ຢູ່ກົງຂ້າມ	ຮ້ານຢູ່ກົງຂ້າມທະນາຄານ.
or	ຫຼື	ຊາຫຼືກາເຟ?
orange	ສົ້ມ;ສີສົ້ມ	ໝາກສົ້ມນີ້ຫວານ.
order	ສັ່ງ;ຄຳສັ່ງ	ຂ້ອຍສັ່ງຊຸບ.
other	ອື່ນ;ອີກ	ໃຊ້ປະຕູອື່ນ.
our	ຂອງພວກເຮົາ	ນີ້ແມ່ນຫ້ອງຮຽນຂອງພວກເຮົາ.
out	ອອກ;ຂ້າງນອກ	ອອກໄປຫຼັງອາຫານທ່ຽງ.
outside	ຂ້າງນອກ	ເດັກນ້ອຍຫຼິ້ນຢູ່ຂ້າງນອກ.
over	ເໜືອ;ຂ້າມ	ເຮືອບິນບິນເໜືອເມືອງ.
own	ຂອງຕົນເອງ	ຂ້ອຍມີຫ້ອງຂອງຕົນເອງ.
page	ໜ້າ	ເປີດໜ້າສິບ.
paint	ທາສີ;ແຕ້ມຮູບ	ທາຝາເປັນສີຟ້າ.
painting	ຮູບແຕ້ມ	ຮູບແຕ້ມນີ້ງາມ.
pair	ຄູ່	ຂ້ອຍຕ້ອງການຖົງຕີນໜຶ່ງຄູ່.
paper	ເຈ້ຍ	ຂຽນໃສ່ເຈ້ຍນີ້.
paragraph	ວັກ	ອ່ານວັກທຳອິດ.
parent	ພໍ່ແມ່	ພໍ່ແມ່ຄົນໜຶ່ງລໍຖ້າຂ້າງນອກ.
park	ສວນສາທາລະນະ;ຈອດ	ພວກເຮົາຈອດໃກ້ສະຖານີ.
part	ສ່ວນ	ສ່ວນນີ້ງ່າຍ.
partner	ຄູ່ຮ່ວມງານ;ຄູ່	ເຮັດວຽກກັບຄູ່.
party	ງານລ້ຽງ	ງານລ້ຽງເລີ່ມຕອນເຈັດໂມງ.
passport	ໜັງສືຜ່ານແດນ	ກະລຸນາສະແດງໜັງສືຜ່ານແດນ.
past	ຜ່ານມາ;ເລີຍ	ດຽວນີ້ຫົກໂມງເຄິ່ງ.
pay	ຈ່າຍເງິນ	ຂ້ອຍຈ່າຍດ້ວຍບັດ.
pen	ປາກກາ	ປາກການີ້ສີຟ້າ.
pencil	ສໍດຳ	ຂ້ອຍຂຽນດ້ວຍສໍດຳ.
people	ຄົນ;ຜູ້ຄົນ	ຄົນຫຼາຍຢູ່ທີ່ນີ້.
pepper	ພິກໄທ	ໃສ່ພິກໄທໃນຊຸບ.
perfect	ສົມບູນແບບ	ຄຳຕອບຂອງເຈົ້າສົມບູນແບບ.
period	ໄລຍະເວລາ;ຄາບຮຽນ	ຄາບຮຽນນີ້ສັ້ນ.
person	ຄົນ	ຄົນໜຶ່ງກຳລັງລໍຖ້າ.
personal	ສ່ວນຕົວ	ນີ້ແມ່ນໂທລະສັບສ່ວນຕົວຂອງຂ້ອຍ.
phone	ໂທລະສັບ	ໂທລະສັບຂ້ອຍຢູ່ໃນກະເປົາ.
photo	ຮູບຖ່າຍ	ຖ່າຍຮູບທີ່ນີ້.
photograph	ຮູບຖ່າຍ	ຮູບຖ່າຍນີ້ເກົ່າ.
phrase	ວະລີ	ກະລຸນາເວົ້າວະລີນີ້ອີກຄັ້ງ.
piano	ເປຍໂນ	ນາງຫຼິ້ນເປຍໂນ.
picture	ຮູບພາບ	ເບິ່ງຮູບພາບນີ້.
piece	ຊິ້ນ;ສ່ວນ	ເອົາເຄັກໜຶ່ງຊິ້ນ.
pig	ໝູ	ໝູຢູ່ໃນຟາມ.
pink	ສີບົວ	ກະເປົາຂອງນາງສີບົວ.
place	ສະຖານທີ່;ບ່ອນ	ສະຖານທີ່ນີ້ງຽບ.
plan	ແຜນການ	ພວກເຮົາຕ້ອງການແຜນການ.
plane	ເຮືອບິນ	ເຮືອບິນມາຊ້າ.
plant	ພືດ;ປູກ	ຫົດນ້ຳຕົ້ນໄມ້ມື້ນີ້.
play	ຫຼິ້ນ	ເດັກນ້ອຍຫຼິ້ນໃນສວນ.
player	ຜູ້ຫຼິ້ນ	ຜູ້ຫຼິ້ນວິ່ງໄວ.
please	ກະລຸນາ	ກະລຸນານັ່ງທີ່ນີ້.
point	ຈຸດ	ຈຸດນີ້ສຳຄັນ.
police	ຕຳຫຼວດ	ຕຳຫຼວດຢູ່ຂ້າງນອກ.
policeman	ຕຳຫຼວດຊາຍ	ຕຳຫຼວດຊາຍຊ່ວຍພວກເຮົາ.
pool	ສະລອຍນ້ຳ	ສະລອຍນ້ຳເຢັນ.
poor	ທຸກຍາກ;ນ່າສົງສານ	ເດັກທຸກຍາກຫິວ.
popular	ນິຍົມ	ເພງນີ້ນິຍົມ.
positive	ບວກ;ໃນທາງດີ	ນີ້ເປັນຜົນບວກ.
possible	ເປັນໄປໄດ້	ມື້ນີ້ເປັນໄປໄດ້ບໍ?
post	ໂພສ;ຈົດໝາຍ	ຂ້ອຍອ່ານໂພສຂອງນາງອອນລາຍ.
potato	ມັນຝຣັ່ງ	ຂ້ອຍກິນມັນຝຣັ່ງໜຶ່ງຫົວ.
pound	ປອນ	ມັນລາຄາໜຶ່ງປອນ.
practice	ການຝຶກ	ການຝຶກຊ່ວຍທຸກມື້.
practise	ຝຶກ;ປະຕິບັດ	ຂ້ອຍຝຶກພາສາອັງກິດທຸກມື້.
prefer	ມັກກວ່າ	ຂ້ອຍມັກຊາກວ່າ.
prepare	ກຽມ	ກຽມກະເປົາຂອງເຈົ້າຄືນນີ້.
present	ຢູ່;ຂອງຂວັນ	ນາງຢູ່ມື້ນີ້.
pretty	ງາມ;ໜ້າຮັກ	ສວນນີ້ງາມ.
price	ລາຄາ	ລາຄາຕ່ຳ.
probably	ອາດຈະ;ຄົງຈະ	ນາງຄົງຈະຮູ້.
problem	ບັນຫາ	ບັນຫານີ້ນ້ອຍ.
product	ຜະລິດຕະພັນ	ຜະລິດຕະພັນນີ້ໃໝ່.
programme	ລາຍການ	ລາຍການເລີ່ມດຽວນີ້.
project	ໂຄງການ	ໂຄງການຂອງພວກເຮົາພ້ອມແລ້ວ.
purple	ສີມ່ວງ	ເສື້ອນີ້ສີມ່ວງ.
put	ວາງ;ໃສ່	ວາງປຶ້ມໄວ້ທີ່ນີ້.
quarter	ໜຶ່ງສ່ວນສີ່;ສິບຫ້ານາທີ	ດຽວນີ້ສອງໂມງສິບຫ້ານາທີ.
question	ຄຳຖາມ	ຖາມຄຳຖາມໜຶ່ງ.
quick	ໄວ;ຮວດເລັວ	ນີ້ແມ່ນການທົດສອບໄວ.
quickly	ຢ່າງໄວ	ກະລຸນາຍ່າງຢ່າງໄວ.
quiet	ງຽບ	ຫ້ອງສະໝຸດງຽບ.
quite	ຂ້ອນຂ້າງ;ພໍສົມຄວນ	ຫ້ອງນີ້ຂ້ອນຂ້າງນ້ອຍ.
radio	ວິທະຍຸ	ວິທະຍຸສຽງດັງ.
rain	ຝົນ	ຝົນເລີ່ມຕົກດຽວນີ້.
read	ອ່ານ	ອ່ານປະໂຫຍກນີ້.
reader	ຜູ້ອ່ານ	ຜູ້ອ່ານມັກເລື່ອງນີ້.
reading	ການອ່ານ	ການອ່ານຊ່ວຍຂ້ອຍຮຽນ.
ready	ພ້ອມ	ອາຫານຄ່ຳພ້ອມແລ້ວ.
real	ແທ້;ຈິງ	ນີ້ແມ່ນບັນຫາແທ້.
really	ແທ້ໆ;ຈິງໆ	ຂ້ອຍມັກເພງນີ້ແທ້ໆ.
reason	ເຫດຜົນ	ບອກເຫດຜົນໃຫ້ຂ້ອຍ.
red	ສີແດງ	ປະຕູສີແດງ.
relax	ຜ່ອນຄາຍ;ພັກຜ່ອນ	ພັກຜ່ອນຫຼັງເຮັດວຽກ.
remember	ຈື່	ຈື່ໜັງສືຜ່ານແດນຂອງເຈົ້າ.
repeat	ເວົ້າຊ້ຳ;ເຮັດຊ້ຳ	ກະລຸນາເວົ້າປະໂຫຍກຊ້ຳ.
report	ລາຍງານ	ອ່ານລາຍງານຄືນນີ້.
restaurant	ຮ້ານອາຫານ	ຮ້ານອາຫານຄົນຫຼາຍ.
result	ຜົນ;ຜົນລັບ	ຜົນລັບດີ.
return	ກັບຄືນ;ສົ່ງຄືນ	ສົ່ງປຶ້ມຄືນມື້ອື່ນ.
rice	ເຂົ້າ;ເຂົ້າສານ	ຂ້ອຍກິນເຂົ້າຕອນທ່ຽງ.
rich	ຮັ່ງມີ;ອຸດົມ	ເມືອງນີ້ຮັ່ງມີ.
ride	ຂີ່	ຂ້ອຍຂີ່ລົດຖີບ.
right	ຖືກຕ້ອງ;ຂວາ	ລ້ຽວຂວາທີ່ນີ້.
river	ແມ່ນ້ຳ	ແມ່ນ້ຳກວ້າງ.
road	ຖະໜົນ	ຖະໜົນນີ້ຍາວ.
room	ຫ້ອງ	ຫ້ອງຂ້ອຍສະອາດ.
routine	ກິດຈະວັດປະຈຳວັນ	ກິດຈະວັດຂ້ອຍເລີ່ມແຕ່ເຊົ້າ.
rule	ກົດ;ກົດລະບຽບ	ກົດນີ້ງ່າຍ.
run	ແລ່ນ	ຂ້ອຍແລ່ນທຸກເຊົ້າ.
sad	ເສົ້າ	ລາວເສົ້າມື້ນີ້.
salad	ສະຫຼັດ	ສະຫຼັດນີ້ສົດ.
salt	ເກືອ	ໃສ່ເກືອໜ້ອຍໜຶ່ງ.
same	ຄືກັນ	ພວກເຮົາມີກະເປົາຄືກັນ.
sandwich	ແຊນວິດ	ຂ້ອຍກິນແຊນວິດ.
Saturday	ວັນເສົາ	ພວກເຮົາພົບກັນວັນເສົາ.
say	ເວົ້າ	ກະລຸນາເວົ້າຊື່ຂອງເຈົ້າ.
school	ໂຮງຮຽນ	ໂຮງຮຽນຂ້ອຍຢູ່ໃກ້ນີ້.
science	ວິທະຍາສາດ	ຂ້ອຍຮຽນວິທະຍາສາດ.
scientist	ນັກວິທະຍາສາດ	ນັກວິທະຍາສາດຖາມຄຳຖາມ.
sea	ທະເລ	ທະເລສີຟ້າ.
second1 (unit of time)	ວິນາທີ	ລໍຖ້າໜຶ່ງວິນາທີ.
section	ສ່ວນ	ອ່ານສ່ວນນີ້.
see	ເຫັນ	ຂ້ອຍເຫັນໝູ່ຂອງຂ້ອຍ.
sell	ຂາຍ	ພວກເຂົາຂາຍໝາກໄມ້ສົດ.
send	ສົ່ງ	ສົ່ງຂໍ້ຄວາມດຽວນີ້.
sentence	ປະໂຫຍກ	ຂຽນປະໂຫຍກໜຶ່ງ.
September	ເດືອນກັນຍາ	ໂຮງຮຽນເລີ່ມໃນເດືອນກັນຍາ.
seven	ເຈັດ	ຄົນເຈັດຄົນຢູ່ທີ່ນີ້.
seventeen	ສິບເຈັດ	ລາວອາຍຸສິບເຈັດປີ.
seventy	ເຈັດສິບ	ແມ່ເຖົ້າຂ້ອຍອາຍຸເຈັດສິບປີ.
share	ແບ່ງປັນ	ແບ່ງປັນເຄັກ.
she	ນາງ;ລາວ	ນາງແມ່ນເອື້ອຍຂ້ອຍ.
sheep	ແກະ	ແກະກິນຫຍ້າ.
shirt	ເສື້ອ	ເສື້ອຂອງລາວສະອາດ.
shoe	ເກີບ	ເກີບຂ້າງໜຶ່ງຢູ່ໃຕ້ຕຽງ.
shop	ຮ້ານ;ຊື້ເຄື່ອງ	ຮ້ານປິດໄວ.
shopping	ການຊື້ເຄື່ອງ	ການຊື້ເຄື່ອງມື້ນີ້ມ່ວນ.
short	ສັ້ນ	ເລື່ອງນີ້ສັ້ນ.
should modal	ຄວນ	ເຈົ້າຄວນພັກມື້ນີ້.
show	ສະແດງ;ການສະແດງ	ສະແດງປີ້ຂອງເຈົ້າໃຫ້ຂ້ອຍ.
shower	ອາບນ້ຳ;ຝັກບົວ	ຂ້ອຍອາບນ້ຳ.
sick	ປ່ວຍ	ຂ້ອຍຮູ້ສຶກປ່ວຍມື້ນີ້.
similar	ຄ້າຍຄື	ກະເປົາຂອງພວກເຮົາຄ້າຍຄືກັນ.
sing	ຮ້ອງເພງ	ຂ້ອຍຮ້ອງເພງໃນຫ້ອງຮຽນ.
singer	ນັກຮ້ອງ	ນັກຮ້ອງມີຊື່ສຽງ.
sister	ເອື້ອຍ;ນ້ອງສາວ	ນ້ອງສາວຂ້ອຍຍັງນ້ອຍ.
sit	ນັ່ງ	ນັ່ງໃກ້ປ່ອງຢ້ຽມ.
situation	ສະຖານະການ	ສະຖານະການນີ້ໃໝ່.
six	ຫົກ	ປຶ້ມຫົກຫົວຢູ່ທີ່ນີ້.
sixteen	ສິບຫົກ	ນາງອາຍຸສິບຫົກປີ.
sixty	ຫົກສິບ	ພໍ່ຂ້ອຍອາຍຸຫົກສິບປີ.
skill	ທັກສະ	ທັກສະນີ້ມີປະໂຫຍດ.
skirt	ກະໂປງ	ກະໂປງຂອງນາງສີຟ້າ.
sleep	ນອນ;ການນອນ	ຂ້ອຍນອນແປດຊົ່ວໂມງ.
slow	ຊ້າ	ລົດເມຊ້າ.
small	ນ້ອຍ	ຫ້ອງນ້ອຍ.
snake	ງູ	ງູຍາວ.
snow	ຫິມະ	ຫິມະຕົກໃນລະດູໜາວ.
so	ດັ່ງນັ້ນ;ຫຼາຍ	ຂ້ອຍເມື່ອຍດັ່ງນັ້ນຂ້ອຍພັກ.
some	ບາງ;ຈຳນວນໜຶ່ງ	ຂ້ອຍຕ້ອງການນ້ຳບາງສ່ວນ.
somebody	ບາງຄົນ	ບາງຄົນຢູ່ປະຕູ.
someone	ບາງຄົນ	ບາງຄົນປະຂໍ້ຄວາມໄວ້.
something	ບາງຢ່າງ	ຂ້ອຍຕ້ອງການບາງຢ່າງເພື່ອດື່ມ.
sometimes	ບາງຄັ້ງ	ບາງຄັ້ງຂ້ອຍຍ່າງໄປໂຮງຮຽນ.
son	ລູກຊາຍ	ລູກຊາຍຂອງນາງຢູ່ໂຮງຮຽນ.
song	ເພງ	ເພງນີ້ໃໝ່.
soon	ໄວໆນີ້	ພົບກັນໄວໆນີ້.
sorry	ຂໍໂທດ;ເສຍໃຈ	ຂ້ອຍຂໍໂທດ.
sound	ສຽງ	ສຽງດັງ.
soup	ຊຸບ	ຊຸບຮ້ອນ.
south	ທິດໃຕ້	ໂຮງແຮມຢູ່ທາງໃຕ້ຂອງທີ່ນີ້.
space	ພື້ນທີ່;ອາວະກາດ	ມີພື້ນທີ່ສຳລັບຕັ່ງໜຶ່ງໂຕ.
speak	ເວົ້າ	ກະລຸນາເວົ້າຊ້າໆ.
special	ພິເສດ	ມື້ນີ້ເປັນມື້ພິເສດ.
spell	ສະກົດ	ສະກົດຊື່ຂອງເຈົ້າ.
spelling	ການສະກົດ	ກວດການສະກົດຂອງເຈົ້າ.
spend	ໃຊ້ຈ່າຍ	ຂ້ອຍໃຊ້ເງິນກັບອາຫານ.
sport	ກິລາ	ບານເຕະເປັນກິລານິຍົມ.
spring	ລະດູໃບໄມ້ຜຸ;ນ້ຳພຸ	ດອກໄມ້ເຕີບໃນລະດູໃບໄມ້ຜຸ.
stand	ຢືນ	ຢືນໃກ້ປະຕູ.
star	ດາວ	ຂ້ອຍເຫັນດາວສະຫວ່າງ.
start	ເລີ່ມ;ການເລີ່ມ	ເລີ່ມບົດຮຽນດຽວນີ້.
statement	ຄຳຖະແຫຼງ;ຄຳເວົ້າ	ຄຳຖະແຫຼງນີ້ຖືກຕ້ອງ.
station	ສະຖານີ	ສະຖານີຢູ່ໃກ້.
stay	ຢູ່;ພັກ	ຢູ່ເຮືອນມື້ນີ້.
still	ຍັງ;ຍັງຄົງ	ຂ້ອຍຍັງຫິວ.
stop	ຢຸດ;ປ້າຍຢຸດ	ຢຸດຢູ່ມຸມ.
story	ເລື່ອງ	ເລົ່າເລື່ອງໜຶ່ງໃຫ້ຂ້ອຍ.
street	ຖະໜົນ	ຖະໜົນນີ້ງຽບ.
strong	ແຂງແຮງ;ເຂັ້ມແຂງ	ລາວແຂງແຮງ.
student	ນັກຮຽນ	ນັກຮຽນອ່ານປຶ້ມ.
study	ຮຽນ;ການຮຽນ	ຂ້ອຍຮຽນພາສາອັງກິດ.
style	ຮູບແບບ;ສະໄຕລ໌	ຂ້ອຍມັກຮູບແບບນີ້.
subject	ວິຊາ;ຫົວຂໍ້	ພາສາອັງກິດແມ່ນວິຊາຫຼັກຂອງຂ້ອຍ.
success	ຄວາມສຳເລັດ	ຄວາມສຳເລັດຕ້ອງການການຝຶກ.
sugar	ນ້ຳຕານ	ໃສ່ນ້ຳຕານໃນຊາ.
summer	ລະດູຮ້ອນ	ລະດູຮ້ອນຢູ່ນີ້ຮ້ອນ.
sun	ຕາເວັນ;ດວງອາທິດ	ຕາເວັນສະຫວ່າງ.
Sunday	ວັນອາທິດ	ພວກເຮົາພັກວັນອາທິດ.
supermarket	ຊູເປີມາເກັດ	ຊູເປີມາເກັດເປີດ.
sure	ແນ່ໃຈ	ຂ້ອຍແນ່ໃຈ.
sweater	ເສື້ອກັນໜາວ	ເສື້ອກັນໜາວຂອງຂ້ອຍອົບອຸ່ນ.
swim	ລອຍນ້ຳ	ຂ້ອຍລອຍນ້ຳທຸກອາທິດ.
swimming	ການລອຍນ້ຳ	ການລອຍນ້ຳເປັນການອອກກຳລັງດີ.
table	ໂຕະ	ກະແຈຢູ່ເທິງໂຕະ.`;

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
  if (lines.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Lao rows, found ${lines.length}`);
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
      throw new Error(`Lao example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!LAO_RE.test(display) || !LAO_RE.test(example)) {
      throw new Error(`Lao display/example must contain Lao script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Lao display/example contains Latin fallback text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (LAO_TOKEN_SPACE_RE.test(example)) {
      throw new Error(`Lao example contains generated token spaces for ${sourceHeadword}: ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Lao display/example contains unexpected non-Lao script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Lao translation row for ${sourceHeadword}`);
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
    "Generate NE support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after NE.",
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
    throw new Error(`Usage: node ${SCRIPT_PATH} --contract=<contract.json>`);
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== RELEASE_ID) {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(LO_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Lao translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Lao translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Lao; display cells use Lao-script citation/base forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: LO Lao display/example cells, sentence punctuation, no Latin fallback, no generated Lao token spaces and unexpected-script leakage guard
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(SUMMARY_PATH, summary);

  const updatedContract = updateContract(contract, JSONL_PATH, SUMMARY_PATH, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: JSONL_PATH,
    contract_updated: contractPath,
    completed_support_languages: updatedContract.latest_support_translation_batches.length,
    next_language: "NE",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
