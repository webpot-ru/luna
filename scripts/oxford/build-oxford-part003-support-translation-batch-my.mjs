#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_my_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_my_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-my.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "MY";
const BATCH_ID = "my_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?။]$/u;
const MYANMAR_RE = /\p{Script=Myanmar}/u;
const LATIN_RE = /[A-Za-z]/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const MY_TRANSLATIONS_TSV = `source_headword	MY	example_MY
machine	စက်; စက်ကိရိယာ	ဤစက်သည် ကော်ဖီဖျော်သည်။
magazine	မဂ္ဂဇင်း	သူသည် ဂီတမဂ္ဂဇင်းကို ဖတ်သည်။
main	အဓိက	ဤသည် အဓိကတံခါးဖြစ်သည်။
make	ပြုလုပ်သည်; ဖန်တီးသည်	ကျွန်တော်သည် အိမ်မှာ နေ့လယ်စာပြုလုပ်သည်။
man	အမျိုးသား; လူ	ထိုအမျိုးသားသည် ကျွန်တော်၏ဆရာဖြစ်သည်။
many	များသော; အများအပြား	ကျောင်းသားများစွာ ဤနေရာတွင် ရှိသည်။
map	မြေပုံ	မြေပုံကို ကြည့်ပါ။
March	မတ်လ	ကျွန်တော်၏ မွေးနေ့သည် မတ်လတွင် ဖြစ်သည်။
market	ဈေး; စျေးကွက်	ကျွန်တော်တို့သည် ဈေးတွင် အသီးဝယ်သည်။
married	အိမ်ထောင်ရှိသော; လက်ထပ်ပြီးသော	ကျွန်တော်၏အစ်မသည် အိမ်ထောင်ရှိသည်။
May	မေလ	ကျောင်းသည် မေလတွင် ပြီးဆုံးသည်။
maybe	ဖြစ်နိုင်သည်; ဖြစ်ကောင်းဖြစ်မည်	မိုးရွာနိုင်သည်။
me	ကျွန်တော်ကို; ကျွန်မကို	ကျွန်တော်ကို ကူညီပါ။
meal	အစားအစာ; ထမင်း	ဤအစားအစာသည် ပူသည်။
mean	အဓိပ္ပာယ်ရှိသည်; ဆိုလိုသည်	ဤဆိုင်းဘုတ်က ဘာကိုဆိုလိုသနည်း။
meaning	အဓိပ္ပာယ်	အဓိပ္ပာယ်က ဘာလဲ။
meat	အသား	ကျွန်တော်သည် ညစာတွင် အသားစားသည်။
meet	တွေ့သည်; တွေ့ဆုံသည်	ကျွန်တော်တို့သည် သင်တန်းပြီးနောက် တွေ့သည်။
meeting	အစည်းအဝေး	အစည်းအဝေးသည် ယခု စတင်သည်။
member	အဖွဲ့ဝင်	သူသည် ကလပ်အဖွဲ့ဝင်ဖြစ်သည်။
menu	မီနူး; အစားအသောက်စာရင်း	မီနူးကို ဖတ်ပါ။
message	စာတို; သတင်းစကား	ကျွန်တော်သည် စာတိုတစ်စောင် ပို့သည်။
metre	မီတာ	ရှေ့သို့ တစ်မီတာ လမ်းလျှောက်ပါ။
midnight	သန်းခေါင်	ရထားသည် သန်းခေါင်တွင် ထွက်သည်။
mile	မိုင်	ကျွန်တော်တို့သည် တစ်မိုင် လမ်းလျှောက်သည်။
milk	နို့	ကျွန်တော်သည် မနက်စာနှင့် နို့သောက်သည်။
million	သန်း	ဤနေရာတွင် လူတစ်သန်း နေထိုင်သည်။
minute1	မိနစ်	တစ်မိနစ် စောင့်ပါ။
miss	လွမ်းသည်; လွတ်သွားသည်	ကျွန်တော်သည် ကျောင်းဟောင်းကို လွမ်းသည်။
mistake	အမှား	ဤအဖြေတွင် အမှားရှိသည်။
model	မော်ဒယ်; နမူနာ	ဤသည် မော်ဒယ်ငယ်ဖြစ်သည်။
modern	ခေတ်မီသော	မီးဖိုချောင်သည် ခေတ်မီသည်။
moment	ခဏ; အခိုက်အတန့်	ခဏ စောင့်ပါ။
Monday	တနင်္လာနေ့	ကျွန်တော်တို့သည် တနင်္လာနေ့တွင် အလုပ်စသည်။
money	ငွေ	ကျွန်တော်သည် ငွေအနည်းငယ် လိုသည်။
month	လ	ဇွန်လသည် ပူသောလဖြစ်သည်။
more	ပိုများသော; ထပ်၍	ကျွန်တော်သည် အချိန်ပို လိုသည်။
morning	မနက်	ကျွန်တော်သည် မနက်တွင် စာကျက်သည်။
most	အများစု; အများဆုံး	ကျောင်းသားအများစုသည် ဂီတကို ကြိုက်သည်။
mother	အမေ; မိခင်	ကျွန်တော်၏အမေသည် ယနေ့ အလုပ်လုပ်သည်။
mountain	တောင်	တောင်သည် မြင့်သည်။
mouse	ကြွက်	ကြွက်တစ်ကောင်သည် ကုလားထိုင်အောက်တွင် ရှိသည်။
mouth	ပါးစပ်	ပါးစပ်ကို ဖွင့်ပါ။
move	ရွှေ့သည်; လှုပ်သည်	ကုလားထိုင်ကို ဤနေရာသို့ ရွှေ့ပါ။
movie	ရုပ်ရှင်	ယနေ့ည ကျွန်တော်တို့သည် ရုပ်ရှင်ကြည့်သည်။
much	များသော; ဘယ်လောက်	ဒါ ဘယ်လောက်လဲ။
mum	အမေ	အမေသည် အိမ်မှာ ရှိသည်။
museum	ပြတိုက်	ပြတိုက်သည် ဆယ်နာရီတွင် ဖွင့်သည်။
music	ဂီတ	ကျွန်တော်သည် ဂီတနားထောင်သည်။
must modal	လိုသည်; မဖြစ်မနေ	သင်သည် ဤနေရာတွင် ရပ်ရမည်။
my	ကျွန်တော်၏; ကျွန်မ၏	ဤသည် ကျွန်တော်၏စာအုပ်ဖြစ်သည်။
name	အမည်; နာမည်	ဤနေရာတွင် သင့်အမည်ကို ရေးပါ။
natural	သဘာဝ; သဘာဝကျသော	ဤဖျော်ရည်သည် သဘာဝဖြစ်သည်။
near	အနီး; နီးသော	ဘဏ်သည် ဤနေရာအနီးတွင် ရှိသည်။
need	လိုသည်; လိုအပ်ချက်	ကျွန်တော်သည် ဘောပင်လိုသည်။
negative	အနုတ်လက္ခဏာ; မကောင်းသော	ဤအဖြေသည် အနုတ်လက္ခဏာဖြစ်သည်။
neighbour	အိမ်နီးချင်း	ကျွန်တော်၏အိမ်နီးချင်းသည် ဖော်ရွေသည်။
never	ဘယ်တော့မှမ	ကျွန်တော်သည် ကော်ဖီကို ဘယ်တော့မှ မသောက်ပါ။
new	အသစ်	ဤဖုန်းသည် အသစ်ဖြစ်သည်။
news	သတင်း	ယနေ့ သတင်းကောင်းသည်။
newspaper	သတင်းစာ	သူသည် သတင်းစာဖတ်သည်။
next	နောက်တစ်ခု; လာမည့်	နောက်ဘတ်စ်ကားသည် နောက်ကျသည်။
next to	ဘေးတွင်; ကပ်လျက်	ကျွန်တော်ဘေးတွင် ထိုင်ပါ။
nice	ကောင်းသော; လှသော	အခန်းသည် ကောင်းသည်။
night	ည	ကျွန်တော်သည် ညတွင် အိပ်သည်။
nine	ကိုး	ကျောင်းသားကိုးယောက် ဤနေရာတွင် ရှိသည်။
nineteen	ဆယ့်ကိုး	သူသည် ဆယ့်ကိုးနှစ်ရှိသည်။
ninety	ကိုးဆယ်	ကျွန်တော်၏အဖိုးသည် ကိုးဆယ်နှစ်ရှိသည်။
no	မဟုတ်; မရှိ	မဟုတ်ပါ၊ ကျေးဇူးတင်ပါတယ်။
no one	ဘယ်သူမှမရှိ	အခန်းထဲတွင် ဘယ်သူမှမရှိ။
nobody	ဘယ်သူမှမရှိ	အိမ်တွင် ဘယ်သူမှမရှိ။
north	မြောက်	ဘူတာသည် ဤနေရာ၏ မြောက်ဘက်တွင် ရှိသည်။
nose	နှာခေါင်း	ကျွန်တော်၏နှာခေါင်းသည် အေးနေသည်။
not	မ	ကျွန်တော်သည် မပင်ပန်းပါ။
note	မှတ်စု	ယခု မှတ်စုတစ်ခု ရေးပါ။
nothing	ဘာမှမရှိ	သေတ္တာထဲတွင် ဘာမှမရှိ။
November	နိုဝင်ဘာလ	ကျွန်တော်၏သင်တန်းသည် နိုဝင်ဘာလတွင် စတင်သည်။
now	ယခု; အခု	ယခု ဒီနေရာသို့ လာပါ။
number	နံပါတ်; ကိန်းဂဏန်း	ဤနေရာတွင် နံပါတ်ကို ရေးပါ။
nurse	သူနာပြု	သူနာပြုသည် ကြင်နာသည်။
object	ပစ္စည်း; အရာဝတ္ထု	ပစ္စည်းကို စားပွဲပေါ်တွင် ထားပါ။
o’clock	နာရီတိတိ	အတန်းသည် ကိုးနာရီတိတိ စသည်။
October	အောက်တိုဘာလ	ကျွန်တော်တို့သည် အောက်တိုဘာလတွင် ခရီးသွားသည်။
of	၏	ဤသည် လက်ဖက်ရည်ခွက်ဖြစ်သည်။
off	ပိတ်ထားသော; ပိတ်	မီးကို ပိတ်ပါ။
office	ရုံး	ကျွန်တော်၏ရုံးသည် သေးသည်။
often	မကြာခဏ	ကျွန်တော်သည် မကြာခဏ ကျောင်းသို့ လမ်းလျှောက်သွားသည်။
oh	အိုး	အိုး၊ ယခု နားလည်ပြီ။
OK	အိုကေ; အဆင်ပြေ	ဒါ အဆင်ပြေလား။
old	ဟောင်းသော; အသက်ကြီးသော	ဤအိမ်သည် ဟောင်းသည်။
on	ပေါ်တွင်; ဖွင့်ထားသော	စာအုပ်သည် စားပွဲပေါ်တွင် ရှိသည်။
once	တစ်ကြိမ်	ကျွန်တော်သည် တစ်ပတ်လျှင် တစ်ကြိမ် ဖုန်းဆက်သည်။
one	တစ်	ကျွန်တော်တွင် ညီမတစ်ယောက် ရှိသည်။
onion	ကြက်သွန်နီ	ကြက်သွန်နီတစ်လုံးကို လှီးပါ။
online	အွန်လိုင်း	ကျွန်တော်သည် အွန်လိုင်းတွင် စာသင်သည်။
only	သာ; ပဲ	ကျွန်တော်တွင် အိတ်တစ်လုံးသာ ရှိသည်။
open	ဖွင့်ထားသော; ဖွင့်သည်	ပြတင်းပေါက်ကို ဖွင့်ပါ။
opinion	ထင်မြင်ချက်	သင့်ထင်မြင်ချက်က ဘာလဲ။
opposite	ဆန့်ကျင်ဘက်; မျက်နှာချင်းဆိုင်	ဆိုင်သည် ဘဏ်၏ မျက်နှာချင်းဆိုင်တွင် ရှိသည်။
or	သို့မဟုတ်	လက်ဖက်ရည် သို့မဟုတ် ကော်ဖီလား။
orange	လိမ္မော်သီး; လိမ္မော်ရောင်	ဤလိမ္မော်သီးသည် ချိုသည်။
order	မှာယူသည်; အမိန့်	ကျွန်တော်သည် စွပ်ပြုတ်မှာယူသည်။
other	အခြား	အခြားတံခါးကို အသုံးပြုပါ။
our	ကျွန်တော်တို့၏	ဤသည် ကျွန်တော်တို့၏ စာသင်ခန်းဖြစ်သည်။
out	အပြင်; အပြင်သို့	နေ့လယ်စာပြီးနောက် အပြင်သို့ သွားပါ။
outside	အပြင်ဘက်	ကလေးများသည် အပြင်ဘက်တွင် ကစားသည်။
over	အပေါ်တွင်; ကျော်၍	လေယာဉ်သည် မြို့အပေါ်မှ ပျံသည်။
own	ကိုယ်ပိုင်	ကျွန်တော်တွင် ကိုယ်ပိုင်အခန်း ရှိသည်။
page	စာမျက်နှာ	စာမျက်နှာဆယ်ကို ဖွင့်ပါ။
paint	ဆေး; ဆေးသုတ်သည်	နံရံကို အပြာရောင်ဆေးသုတ်ပါ။
painting	ပန်းချီကား	ဤပန်းချီကားသည် လှသည်။
pair	တစ်စုံ	ကျွန်တော်သည် ခြေအိတ်တစ်စုံ လိုသည်။
paper	စက္ကူ	ဤစက္ကူပေါ်တွင် ရေးပါ။
paragraph	စာပိုဒ်	ပထမစာပိုဒ်ကို ဖတ်ပါ။
parent	မိဘ	မိဘတစ်ဦးသည် အပြင်တွင် စောင့်နေသည်။
park	ပန်းခြံ; ကားရပ်သည်	ကျွန်တော်တို့သည် ဘူတာအနီးတွင် ကားရပ်သည်။
part	အပိုင်း	ဤအပိုင်းသည် လွယ်သည်။
partner	ဖက်; အဖော်	ဖက်တစ်ဦးနှင့် အလုပ်လုပ်ပါ။
party	ပါတီ; ပွဲ	ပါတီသည် ခုနစ်နာရီတွင် စတင်သည်။
passport	နိုင်ငံကူးလက်မှတ်	သင့်နိုင်ငံကူးလက်မှတ်ကို ပြပါ။
past	အတိတ်; ကျော်လွန်သော	ယခု ခြောက်နာရီခွဲ ဖြစ်သည်။
pay	ပေးချေသည်	ကျွန်တော်သည် ကတ်ဖြင့် ပေးချေသည်။
pen	ဘောပင်	ဤဘောပင်သည် အပြာရောင်ဖြစ်သည်။
pencil	ခဲတံ	ကျွန်တော်သည် ခဲတံဖြင့် ရေးသည်။
people	လူများ	လူများစွာ ဤနေရာတွင် ရှိသည်။
pepper	ငရုတ်ကောင်း; ငရုတ်သီး	စွပ်ပြုတ်ထဲသို့ ငရုတ်ကောင်းထည့်ပါ။
perfect	ပြည့်စုံသော; အလွန်မှန်သော	သင့်အဖြေသည် အလွန်မှန်သည်။
period	ကာလ; အချိန်ပိုင်း	အတန်းချိန်သည် တိုသည်။
person	လူ; ပုဂ္ဂိုလ်	လူတစ်ယောက် စောင့်နေသည်။
personal	ကိုယ်ရေးကိုယ်တာ	ဤသည် ကျွန်တော်၏ ကိုယ်ရေးကိုယ်တာဖုန်းဖြစ်သည်။
phone	ဖုန်း; ဖုန်းဆက်သည်	ကျွန်တော်၏ဖုန်းသည် အိတ်ထဲတွင် ရှိသည်။
photo	ဓာတ်ပုံ	ဤနေရာတွင် ဓာတ်ပုံရိုက်ပါ။
photograph	ဓာတ်ပုံ	ဤဓာတ်ပုံသည် ဟောင်းသည်။
phrase	စကားစု	စကားစုကို ပြန်ပြောပါ။
piano	စန္ဒရား	သူသည် စန္ဒရားတီးသည်။
picture	ပုံ; ဓာတ်ပုံ	ဤပုံကို ကြည့်ပါ။
piece	အပိုင်း; တစ်စိတ်တစ်ပိုင်း	ကိတ်မုန့်တစ်ပိုင်း ယူပါ။
pig	ဝက်	ဝက်သည် ခြံထဲတွင် ရှိသည်။
pink	ပန်းရောင်	သူမ၏အိတ်သည် ပန်းရောင်ဖြစ်သည်။
place	နေရာ	ဤနေရာသည် တိတ်ဆိတ်သည်။
plan	အစီအစဉ်	ကျွန်တော်တို့သည် အစီအစဉ်လိုသည်။
plane	လေယာဉ်	လေယာဉ်သည် နောက်ကျနေသည်။
plant	အပင်; စိုက်သည်	ယနေ့ အပင်ကို ရေလောင်းပါ။
play	ကစားသည်; ပြဇာတ်	ကလေးများသည် ပန်းခြံတွင် ကစားသည်။
player	ကစားသမား	ကစားသမားသည် မြန်မြန်ပြေးသည်။
please	ကျေးဇူးပြု၍	ကျေးဇူးပြု၍ ဤနေရာတွင် ထိုင်ပါ။
point	အချက်; အမှတ်	ဤအချက်သည် အရေးကြီးသည်။
police	ရဲ	ရဲများသည် အပြင်တွင် ရှိသည်။
policeman	ရဲသား	ရဲသားသည် ကျွန်တော်တို့ကို ကူညီသည်။
pool	ရေကူးကန်	ရေကူးကန်သည် အေးသည်။
poor	ဆင်းရဲသော	ဆင်းရဲသောကလေးသည် ဗိုက်ဆာသည်။
popular	လူကြိုက်များသော	ဤသီချင်းသည် လူကြိုက်များသည်။
positive	အပေါင်းလက္ခဏာ; ကောင်းသော	ဤသည် ကောင်းသောရလဒ်ဖြစ်သည်။
possible	ဖြစ်နိုင်သော	ယနေ့ ဖြစ်နိုင်ပါသလား။
post	ပို့စ်; စာတိုက်	ကျွန်တော်သည် သူမ၏ပို့စ်ကို အွန်လိုင်းတွင် ဖတ်သည်။
potato	အာလူး	ကျွန်တော်သည် အာလူးတစ်လုံး စားသည်။
pound	ပေါင်	ဒါသည် တစ်ပေါင် ကျသင့်သည်။
practice	လေ့ကျင့်မှု	နေ့စဉ် လေ့ကျင့်မှုသည် ကူညီသည်။
practise	လေ့ကျင့်သည်	ကျွန်တော်သည် နေ့စဉ် အင်္ဂလိပ်စာလေ့ကျင့်သည်။
prefer	ပိုကြိုက်သည်	ကျွန်တော်သည် လက်ဖက်ရည်ကို ပိုကြိုက်သည်။
prepare	ပြင်ဆင်သည်	ယနေ့ည သင့်အိတ်ကို ပြင်ဆင်ပါ။
present	ရှိနေသော; လက်ဆောင်	သူသည် ယနေ့ ရှိနေသည်။
pretty	လှသော; အတော်	ဥယျာဉ်သည် လှသည်။
price	ဈေးနှုန်း	ဈေးနှုန်းသည် နိမ့်သည်။
probably	ဖြစ်နိုင်ချေများသည်	သူသည် သိနိုင်သည်။
problem	ပြဿနာ	ဤပြဿနာသည် သေးသည်။
product	ထုတ်ကုန်	ဤထုတ်ကုန်သည် အသစ်ဖြစ်သည်။
programme	အစီအစဉ်	အစီအစဉ်သည် ယခု စတင်သည်။
project	စီမံကိန်း	ကျွန်တော်တို့၏စီမံကိန်းသည် အဆင်သင့်ဖြစ်သည်။
purple	ခရမ်းရောင်	အင်္ကျီသည် ခရမ်းရောင်ဖြစ်သည်။
put	ထားသည်	စာအုပ်ကို ဤနေရာတွင် ထားပါ။
quarter	လေးပုံတစ်ပုံ; ဆယ့်ငါးမိနစ်	ယခု နှစ်နာရီဆယ့်ငါးမိနစ် ဖြစ်သည်။
question	မေးခွန်း	မေးခွန်းတစ်ခု မေးပါ။
quick	မြန်သော; တိုသော	ဤသည် မြန်သောစမ်းသပ်မှုဖြစ်သည်။
quickly	မြန်မြန်	ကျေးဇူးပြု၍ မြန်မြန် လမ်းလျှောက်ပါ။
quiet	တိတ်ဆိတ်သော	စာကြည့်တိုက်သည် တိတ်ဆိတ်သည်။
quite	အတော်; လုံလောက်စွာ	ဤအခန်းသည် အတော်သေးသည်။
radio	ရေဒီယို	ရေဒီယိုသည် ကျယ်လောင်သည်။
rain	မိုး; မိုးရွာသည်	ယခု မိုးစတင်ရွာသည်။
read	ဖတ်သည်	ဤဝါကျကို ဖတ်ပါ။
reader	စာဖတ်သူ	စာဖတ်သူသည် ပုံပြင်ကို ကြိုက်သည်။
reading	စာဖတ်ခြင်း	စာဖတ်ခြင်းသည် ကျွန်တော်ကို သင်ယူရန် ကူညီသည်။
ready	အဆင်သင့်	ညစာသည် အဆင်သင့်ဖြစ်သည်။
real	တကယ့်; အမှန်	ဤသည် တကယ့်ပြဿနာဖြစ်သည်။
really	တကယ်	ကျွန်တော်သည် ဤသီချင်းကို တကယ်ကြိုက်သည်။
reason	အကြောင်းရင်း	အကြောင်းရင်းကို ပြောပါ။
red	အနီရောင်	တံခါးသည် အနီရောင်ဖြစ်သည်။
relax	အနားယူသည်	အလုပ်ပြီးနောက် အနားယူပါ။
remember	မှတ်မိသည်; သတိရသည်	သင့်နိုင်ငံကူးလက်မှတ်ကို သတိရပါ။
repeat	ပြန်ပြောသည်; ထပ်လုပ်သည်	ဝါကျကို ပြန်ပြောပါ။
report	အစီရင်ခံစာ	ယနေ့ည အစီရင်ခံစာကို ဖတ်ပါ။
restaurant	စားသောက်ဆိုင်	စားသောက်ဆိုင်သည် လူများနေသည်။
result	ရလဒ်	ရလဒ်သည် ကောင်းသည်။
return	ပြန်လာသည်; ပြန်ပေးသည်	စာအုပ်ကို မနက်ဖြန် ပြန်ပေးပါ။
rice	ထမင်း; ဆန်	ကျွန်တော်သည် နေ့လယ်စာတွင် ထမင်းစားသည်။
rich	ချမ်းသာသော	မြို့သည် ချမ်းသာသည်။
ride	စီးသည်; စီးနင်းခြင်း	ကျွန်တော်သည် စက်ဘီးစီးသည်။
right	မှန်သော; ညာဘက်	ဤနေရာတွင် ညာဘက်သို့ ကွေ့ပါ။
river	မြစ်	မြစ်သည် ကျယ်သည်။
road	လမ်း	ဤလမ်းသည် ရှည်သည်။
room	အခန်း	ကျွန်တော်၏အခန်းသည် သန့်ရှင်းသည်။
routine	နေ့စဉ်လုပ်ရိုးလုပ်စဉ်	ကျွန်တော်၏လုပ်ရိုးလုပ်စဉ်သည် စောစော စသည်။
rule	စည်းမျဉ်း	ဤစည်းမျဉ်းသည် ရိုးရှင်းသည်။
run	ပြေးသည်	ကျွန်တော်သည် မနက်တိုင်း ပြေးသည်။
sad	ဝမ်းနည်းသော	သူသည် ယနေ့ ဝမ်းနည်းသည်။
salad	ဆလတ်	ဤဆလတ်သည် လတ်ဆတ်သည်။
salt	ဆား	ဆားအနည်းငယ် ထည့်ပါ။
same	တူညီသော	ကျွန်တော်တို့တွင် တူညီသောအိတ် ရှိသည်။
sandwich	ဆန်းဒဝစ်	ကျွန်တော်သည် ဆန်းဒဝစ်စားသည်။
Saturday	စနေနေ့	ကျွန်တော်တို့သည် စနေနေ့တွင် တွေ့သည်။
say	ပြောသည်	သင့်အမည်ကို ပြောပါ။
school	ကျောင်း	ကျွန်တော်၏ကျောင်းသည် ဤနေရာအနီးတွင် ရှိသည်။
science	သိပ္ပံ	ကျွန်တော်သည် သိပ္ပံကို လေ့လာသည်။
scientist	သိပ္ပံပညာရှင်	သိပ္ပံပညာရှင်သည် မေးခွန်းမေးသည်။
sea	ပင်လယ်	ပင်လယ်သည် အပြာရောင်ဖြစ်သည်။
second1 (unit of time)	စက္ကန့်	တစ်စက္ကန့် စောင့်ပါ။
section	အပိုင်း	ဤအပိုင်းကို ဖတ်ပါ။
see	မြင်သည်; တွေ့သည်	ကျွန်တော်သည် မိတ်ဆွေကို တွေ့သည်။
sell	ရောင်းသည်	သူတို့သည် လတ်ဆတ်သောအသီးများ ရောင်းသည်။
send	ပို့သည်	စာတိုကို ယခု ပို့ပါ။
sentence	ဝါကျ	ဝါကျတစ်ကြောင်း ရေးပါ။
September	စက်တင်ဘာလ	ကျောင်းသည် စက်တင်ဘာလတွင် စတင်သည်။
seven	ခုနစ်	လူခုနစ်ယောက် ဤနေရာတွင် ရှိသည်။
seventeen	ဆယ့်ခုနစ်	သူသည် ဆယ့်ခုနစ်နှစ်ရှိသည်။
seventy	ခုနစ်ဆယ်	ကျွန်တော်၏အဖွားသည် ခုနစ်ဆယ်နှစ်ရှိသည်။
share	မျှဝေသည်	ကိတ်မုန့်ကို မျှဝေပါ။
she	သူမ; သူ	သူမသည် ကျွန်တော်၏ညီမဖြစ်သည်။
sheep	သိုး	သိုးသည် မြက်စားသည်။
shirt	ရှပ်အင်္ကျီ	သူ၏ရှပ်အင်္ကျီသည် သန့်ရှင်းသည်။
shoe	ဖိနပ်	ဖိနပ်တစ်ဖက်သည် အိပ်ရာအောက်တွင် ရှိသည်။
shop	ဆိုင်; ဈေးဝယ်သည်	ဆိုင်သည် စောစော ပိတ်သည်။
shopping	ဈေးဝယ်ခြင်း	ယနေ့ ဈေးဝယ်ခြင်းသည် ပျော်စရာကောင်းသည်။
short	တိုသော	ဤပုံပြင်သည် တိုသည်။
should modal	သင့်သည်; လုပ်သင့်သည်	သင်သည် ယနေ့ အနားယူသင့်သည်။
show	ပြသည်; ပြပွဲ	သင့်လက်မှတ်ကို ကျွန်တော်ကို ပြပါ။
shower	ရေချိုးခြင်း; ရေချိုးသည်	ကျွန်တော်သည် မနက်တွင် ရေချိုးသည်။
sick	နေမကောင်းသော	ကျွန်တော်သည် ယနေ့ နေမကောင်းဘူး။
similar	ဆင်တူသော	ကျွန်တော်တို့၏အိတ်များသည် ဆင်တူသည်။
sing	သီချင်းဆိုသည်	ကျွန်တော်သည် အတန်းတွင် သီချင်းဆိုသည်။
singer	အဆိုတော်	အဆိုတော်သည် နာမည်ကြီးသည်။
sister	ညီမ; အစ်မ	ကျွန်တော်၏ညီမသည် ငယ်သည်။
sit	ထိုင်သည်	ပြတင်းပေါက်အနီးတွင် ထိုင်ပါ။
situation	အခြေအနေ	ဤအခြေအနေသည် အသစ်ဖြစ်သည်။
six	ခြောက်	စာအုပ်ခြောက်အုပ် ဤနေရာတွင် ရှိသည်။
sixteen	ဆယ့်ခြောက်	သူမသည် ဆယ့်ခြောက်နှစ်ရှိသည်။
sixty	ခြောက်ဆယ်	ကျွန်တော်၏အဖေသည် ခြောက်ဆယ်နှစ်ရှိသည်။
skill	ကျွမ်းကျင်မှု	ဤကျွမ်းကျင်မှုသည် အသုံးဝင်သည်။
skirt	စကတ်	သူမ၏စကတ်သည် အပြာရောင်ဖြစ်သည်။
sleep	အိပ်သည်; အိပ်စက်ခြင်း	ကျွန်တော်သည် ရှစ်နာရီ အိပ်သည်။
slow	နှေးသော	ဘတ်စ်ကားသည် နှေးသည်။
small	သေးသော	အခန်းသည် သေးသည်။
snake	မြွေ	မြွေသည် ရှည်သည်။
snow	နှင်း; နှင်းကျသည်	ဆောင်းရာသီတွင် နှင်းကျသည်။
so	ထို့ကြောင့်; အလွန်	ကျွန်တော်သည် ပင်ပန်းသည်၊ ထို့ကြောင့် အနားယူသည်။
some	အချို့; နည်းနည်း	ကျွန်တော်သည် ရေနည်းနည်း လိုသည်။
somebody	တစ်ယောက်ယောက်	တံခါးမှာ တစ်ယောက်ယောက်ရှိသည်။
someone	တစ်ယောက်ယောက်	တစ်ယောက်ယောက်သည် စာတိုထားခဲ့သည်။
something	တစ်ခုခု	ကျွန်တော်သည် သောက်ရန် တစ်ခုခု လိုသည်။
sometimes	တစ်ခါတစ်ရံ	ကျွန်တော်သည် တစ်ခါတစ်ရံ ကျောင်းသို့ လမ်းလျှောက်သွားသည်။
son	သား	သူမ၏သားသည် ကျောင်းမှာ ရှိသည်။
song	သီချင်း	ဤသီချင်းသည် အသစ်ဖြစ်သည်။
soon	မကြာမီ	မကြာမီ တွေ့မယ်။
sorry	စိတ်မကောင်းပါ; တောင်းပန်ပါတယ်	ကျွန်တော် စိတ်မကောင်းပါ။
sound	အသံ	အသံသည် ကျယ်လောင်သည်။
soup	စွပ်ပြုတ်	စွပ်ပြုတ်သည် ပူသည်။
south	တောင်	ဟိုတယ်သည် ဤနေရာ၏ တောင်ဘက်တွင် ရှိသည်။
space	နေရာ; အာကာသ	ကုလားထိုင်တစ်လုံးအတွက် နေရာရှိသည်။
speak	စကားပြောသည်	ကျေးဇူးပြု၍ ဖြည်းဖြည်းပြောပါ။
special	အထူး	ယနေ့သည် အထူးနေ့ဖြစ်သည်။
spell	စာလုံးပေါင်းပြသည်	သင့်အမည်ကို စာလုံးပေါင်းပြပါ။
spelling	စာလုံးပေါင်း	သင့်စာလုံးပေါင်းကို စစ်ပါ။
spend	သုံးသည်; အချိန်ကုန်သည်	ကျွန်တော်သည် အစားအစာအတွက် ငွေသုံးသည်။
sport	အားကစား	ဘောလုံးသည် လူကြိုက်များသောအားကစားဖြစ်သည်။
spring	နွေဦး; စမ်းရေ	နွေဦးတွင် ပန်းများ ပေါက်သည်။
stand	ရပ်သည်	တံခါးအနီးတွင် ရပ်ပါ။
star	ကြယ်	ကျွန်တော်သည် တောက်ပသောကြယ်ကို မြင်သည်။
start	စတင်သည်; အစ	သင်ခန်းစာကို ယခု စတင်ပါ။
statement	ထုတ်ပြန်ချက်; ပြောဆိုချက်	ဤထုတ်ပြန်ချက်သည် မှန်သည်။
station	ဘူတာ	ဘူတာသည် အနီးတွင် ရှိသည်။
stay	နေသည်; တည်းခိုသည်	ယနေ့ အိမ်မှာ နေပါ။
still	ယခုထိ; နေဆဲ	ကျွန်တော်သည် ယခုထိ ဗိုက်ဆာသည်။
stop	ရပ်သည်; မှတ်တိုင်	ထောင့်တွင် ရပ်ပါ။
story	ပုံပြင်	ကျွန်တော်ကို ပုံပြင်တစ်ပုဒ် ပြောပါ။
street	လမ်း	ဤလမ်းသည် တိတ်ဆိတ်သည်။
strong	အားကောင်းသော	သူသည် အားကောင်းသည်။
student	ကျောင်းသား	ကျောင်းသားသည် စာအုပ်ဖတ်သည်။
study	လေ့လာသည်; စာကျက်သည်	ကျွန်တော်သည် အင်္ဂလိပ်စာလေ့လာသည်။
style	စတိုင်; ဟန်	ကျွန်တော်သည် ဤစတိုင်ကို ကြိုက်သည်။
subject	ဘာသာရပ်; အကြောင်းအရာ	အင်္ဂလိပ်စာသည် ကျွန်တော်၏အဓိကဘာသာရပ်ဖြစ်သည်။
success	အောင်မြင်မှု	အောင်မြင်မှုအတွက် လေ့ကျင့်မှုလိုသည်။
sugar	သကြား	လက်ဖက်ရည်ထဲသို့ သကြားထည့်ပါ။
summer	နွေရာသီ	ဤနေရာတွင် နွေရာသီသည် ပူသည်။
sun	နေ	နေသည် တောက်ပသည်။
Sunday	တနင်္ဂနွေနေ့	ကျွန်တော်တို့သည် တနင်္ဂနွေနေ့တွင် အနားယူသည်။
supermarket	စူပါမားကတ်	စူပါမားကတ်သည် ဖွင့်ထားသည်။
sure	သေချာသော	ကျွန်တော် သေချာသည်။
sweater	ဆွယ်တာ	ကျွန်တော်၏ဆွယ်တာသည် နွေးသည်။
swim	ရေကူးသည်	ကျွန်တော်သည် အပတ်တိုင်း ရေကူးသည်။
swimming	ရေကူးခြင်း	ရေကူးခြင်းသည် ကောင်းသောလေ့ကျင့်မှုဖြစ်သည်။
table	စားပွဲ	သော့များသည် စားပွဲပေါ်တွင် ရှိသည်။`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Burmese rows, found ${lines.length}`);
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
      throw new Error(`Burmese example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!MYANMAR_RE.test(display) || !MYANMAR_RE.test(example)) {
      throw new Error(`Burmese display/example must contain Myanmar script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (LATIN_RE.test(display) || LATIN_RE.test(example)) {
      throw new Error(`Burmese display/example contains Latin fallback text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Burmese display/example contains unexpected non-Myanmar script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Burmese translation row for ${sourceHeadword}`);
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
    "Generate KM support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after KM.",
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
  const translations = parseTsv(MY_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Burmese translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Burmese translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Burmese; display cells use Myanmar-script citation/base forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: MY Burmese Myanmar-script display/example cells, sentence punctuation, no Latin fallback and unexpected-script leakage guard
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
    next_language: "KM",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
