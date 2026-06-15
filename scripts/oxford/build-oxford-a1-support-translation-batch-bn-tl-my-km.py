#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["BN", "TL", "MY", "KM"]
SENTENCE_END_RE = re.compile(r"[.!?।။។]$")
BENGALI_RE = re.compile(r"[\u0980-\u09FF]")
MYANMAR_RE = re.compile(r"[\u1000-\u109F]")
KHMER_RE = re.compile(r"[\u1780-\u17FF]")


TRANSLATIONS_TSV = """source_headword	BN	example_BN	TL	example_TL	MY	example_MY	KM	example_KM
a, an	অনির্দিষ্ট আর্টিকেল	আমার একটি কলম আছে।	di-tiyak na pantukoy	Mayroon akong bolpen.	မသတ်မှတ်ညွှန်ပြစကားလုံး	ကျွန်တော့်မှာ ဘောပင်တစ်ချောင်းရှိတယ်။	ពាក្យនាំមុខមិនកំណត់	ខ្ញុំមានប៊ិចមួយ។
about	সম্পর্কে; প্রায়	আমরা খাবার সম্পর্কে কথা বলি।	tungkol sa; mga	Pinag-uusapan namin ang pagkain.	အကြောင်း; ခန့်	ကျွန်တော်တို့ အစားအစာအကြောင်းပြောတယ်။	អំពី; ប្រហែល	យើងនិយាយអំពីអាហារ។
above	উপরে	ঘড়িটি দরজার উপরে আছে।	sa ibabaw	Nasa ibabaw ng pinto ang orasan.	အပေါ်မှာ	နာရီက တံခါးအပေါ်မှာရှိတယ်။	នៅខាងលើ	នាឡិកានៅខាងលើទ្វារ។
across	ওপারে; পার হয়ে	দোকানটি রাস্তার ওপারে।	sa kabila	Nasa kabila ng kalye ang tindahan.	တစ်ဖက်မှာ	ဆိုင်က လမ်းတစ်ဖက်မှာရှိတယ်။	នៅម្ខាងទៀត	ហាងនៅម្ខាងទៀតនៃផ្លូវ។
action	কাজ; পদক্ষেপ	তার কাজ আমাকে সাহায্য করে।	kilos; aksyon	Nakakatulong sa akin ang kilos niya.	လုပ်ဆောင်ချက်	သူ့လုပ်ရပ်က ကျွန်တော့်ကိုကူညီတယ်။	សកម្មភាព	សកម្មភាពរបស់គាត់ជួយខ្ញុំ។
activity	কার্যকলাপ	সাঁতার একটি মজার কার্যকলাপ।	gawain	Masayang gawain ang paglangoy.	လှုပ်ရှားမှု	ရေကူးတာက ပျော်စရာလှုပ်ရှားမှုပါ။	សកម្មភាព	ការហែលទឹកជាសកម្មភាពសប្បាយ។
actor	অভিনেতা	অভিনেতা একটি ছবিতে আছে।	aktor	Nasa pelikula ang aktor.	မင်းသား	မင်းသားက ရုပ်ရှင်ထဲမှာပါ။	តារាសម្តែងប្រុស	តារាសម្តែងប្រុសនៅក្នុងខ្សែភាពយន្ត។
actress	অভিনেত্রী	অভিনেত্রী আমাদের দিকে হাসেন।	aktres	Ngumingiti sa amin ang aktres.	မင်းသမီး	မင်းသမီးက ကျွန်တော်တို့ကိုပြုံးတယ်။	តារាសម្តែងស្រី	តារាសម្តែងស្រីញញឹមដាក់យើង។
add	যোগ করা	এখানে তোমার নাম যোগ করো।	idagdag	Idagdag mo rito ang pangalan mo.	ထည့်သည်; ပေါင်းသည်	ဒီမှာ မင်းနာမည်ထည့်ပါ။	បន្ថែម	បន្ថែមឈ្មោះរបស់អ្នកនៅទីនេះ។
address	ঠিকানা	আমার ঠিকানা এই কার্ডে আছে।	address; tirahan	Nasa card na ito ang address ko.	လိပ်စာ	ကျွန်တော့်လိပ်စာက ဒီကတ်ပေါ်မှာရှိတယ်။	អាសយដ្ឋាន	អាសយដ្ឋានរបស់ខ្ញុំនៅលើកាតនេះ។
adult	প্রাপ্তবয়স্ক	একজন প্রাপ্তবয়স্ক দরজার কাছে বসে।	matanda; adult	Nakaupo ang isang matanda malapit sa pinto.	လူကြီး	လူကြီးတစ်ယောက်က တံခါးအနားမှာထိုင်တယ်။	មនុស្សពេញវ័យ	មនុស្សពេញវ័យម្នាក់អង្គុយជិតទ្វារ។
advice	পরামর্শ	তার পরামর্শ সহজ।	payo	Simple ang payo niya.	အကြံဉာဏ်	သူ့အကြံဉာဏ်က ရိုးရှင်းတယ်။	ដំបូន្មាន	ដំបូន្មានរបស់នាងសាមញ្ញ។
afraid	ভয় পাওয়া; ভীত	শিশুটি ভয় পাচ্ছে।	takot	Takot ang bata.	ကြောက်သော	ကလေးက ကြောက်နေတယ်။	ខ្លាច	ក្មេងខ្លាច។
after	পরে	আমি ক্লাসের পরে খাই।	pagkatapos	Kumakain ako pagkatapos ng klase.	ပြီးနောက်	ကျွန်တော် အတန်းပြီးနောက်စားတယ်။	បន្ទាប់ពី	ខ្ញុំញ៉ាំបន្ទាប់ពីថ្នាក់។
afternoon	বিকেল	আমি বিকেলে পড়ি।	hapon	Nag-aaral ako sa hapon.	နေ့လယ်ပိုင်း	ကျွန်တော် နေ့လယ်ပိုင်းမှာစာလေ့လာတယ်။	រសៀល	ខ្ញុំរៀននៅពេលរសៀល។
again	আবার	দয়া করে আবার বলো।	muli; ulit	Pakisabi ulit iyon.	ထပ်; ပြန်	ကျေးဇူးပြု၍ ထပ်ပြောပါ။	ម្តងទៀត	សូមនិយាយវាម្តងទៀត។
age	বয়স	তোমার বয়স কত?	edad	Ilang taon ka na?	အသက်	မင်းအသက်ဘယ်လောက်လဲ။	អាយុ	អ្នកអាយុប៉ុន្មាន?
ago	আগে	আমি দুই দিন আগে এখানে এসেছি।	noon; nakaraan	Dumating ako rito dalawang araw na ang nakaraan.	လွန်ခဲ့သော	ကျွန်တော် ဒီကို လွန်ခဲ့တဲ့နှစ်ရက်ကလာခဲ့တယ်။	មុន	ខ្ញុំបានមកទីនេះពីរថ្ងៃមុន។
agree	একমত হওয়া	আমি তোমার সঙ্গে একমত।	sumang-ayon	Sang-ayon ako sa iyo.	သဘောတူသည်	ကျွန်တော် မင်းနဲ့သဘောတူတယ်။	យល់ព្រម	ខ្ញុំយល់ព្រមជាមួយអ្នក។
air	বাতাস	বাতাস ঠান্ডা।	hangin	Malamig ang hangin.	လေ	လေက အေးတယ်။	ខ្យល់	ខ្យល់ត្រជាក់។
airport	বিমানবন্দর	আমরা বিমানবন্দরে আছি।	paliparan	Nasa paliparan kami.	လေဆိပ်	ကျွန်တော်တို့ လေဆိပ်မှာရှိတယ်။	ព្រលានយន្តហោះ	យើងនៅព្រលានយន្តហោះ។
all	সব; সকল	সব ছাত্র এখানে আছে।	lahat	Narito ang lahat ng estudyante.	အားလုံး	ကျောင်းသားအားလုံး ဒီမှာရှိတယ်။	ទាំងអស់	សិស្សទាំងអស់នៅទីនេះ។
also	এছাড়াও; ও	আমারও চা ভালো লাগে।	rin; din	Gusto ko rin ng tsaa.	လည်း	ကျွန်တော် လက်ဖက်ရည်ကိုလည်းကြိုက်တယ်။	ក៏	ខ្ញុំក៏ចូលចិត្តតែផងដែរ។
always	সবসময়	সে সবসময় জল পান করে।	palagi	Palagi siyang umiinom ng tubig.	အမြဲ	သူမ အမြဲရေသောက်တယ်။	ជានិច្ច	នាងផឹកទឹកជានិច្ច។
amazing	অসাধারণ	দৃশ্যটি অসাধারণ।	kamangha-mangha	Kamangha-mangha ang tanawin.	အံ့သြဖွယ်	မြင်ကွင်းက အံ့သြဖွယ်ကောင်းတယ်။	អស្ចារ្យ	ទេសភាពអស្ចារ្យ។
and	এবং	টম এবং আনা বন্ধু।	at	Magkaibigan sina Tom at Anna.	နှင့်	တွမ်နဲ့ အန်နာက သူငယ်ချင်းတွေပါ။	និង	ថមនិងអាណាជាមិត្តភក្តិ។
angry	রাগান্বিত	সে এখন রাগান্বিত।	galit	Galit siya ngayon.	စိတ်ဆိုးသော	သူ အခုစိတ်ဆိုးနေတယ်။	ខឹង	គាត់ខឹងឥឡូវនេះ។
animal	প্রাণী	কুকুর একটি প্রাণী।	hayop	Hayop ang aso.	တိရစ္ဆာန်	ခွေးက တိရစ္ဆာန်ပါ။	សត្វ	ឆ្កែជាសត្វ។
another	আরেকটি; অন্য	আমি আরেকটি কাপ চাই।	isa pa; iba	Gusto ko ng isa pang tasa.	နောက်တစ်ခု	ကျွန်တော် နောက်ထပ်ခွက်တစ်ခွက်လိုချင်တယ်။	មួយទៀត; ផ្សេងទៀត	ខ្ញុំចង់បានពែងមួយទៀត។
answer	উত্তর; জবাব	উত্তরটি এখানে লেখো।	sagot	Isulat mo rito ang sagot.	အဖြေ	အဖြေကို ဒီမှာရေးပါ။	ចម្លើយ	សរសេរចម្លើយនៅទីនេះ។
any	কোনো; যেকোনো	তোমার কি টাকা আছে?	anumang; kahit ano	May pera ka ba?	မည်သည့်; တစ်ခုခု	မင်းမှာ ပိုက်ဆံရှိလား။	ណាមួយ; ខ្លះ	អ្នកមានលុយទេ?
anyone	যে কেউ; কেউ	কারও কি সাহায্য দরকার?	kahit sino; may tao	May nangangailangan ba ng tulong?	ဘယ်သူမဆို	တစ်ယောက်ယောက် အကူအညီလိုလား။	នរណាម្នាក់	មាននរណាម្នាក់ត្រូវការជំនួយទេ?
anything	কিছু; যেকোনো কিছু	আমি কিছুই দেখতে পাচ্ছি না।	kahit ano	Wala akong nakikitang kahit ano.	ဘာမှ; တစ်ခုခု	ကျွန်တော် ဘာမှမမြင်ဘူး။	អ្វីក៏បាន	ខ្ញុំមិនឃើញអ្វីទេ។
apartment	অ্যাপার্টমেন্ট	আমার অ্যাপার্টমেন্ট ছোট।	apartment; tirahan	Maliit ang apartment ko.	တိုက်ခန်း	ကျွန်တော့်တိုက်ခန်းက သေးတယ်။	អាផាតមិន	អាផាតមិនរបស់ខ្ញុំតូច។
apple	আপেল	এই আপেলটি লাল।	mansanas	Pula ang mansanas na ito.	ပန်းသီး	ဒီပန်းသီးက အနီရောင်ပါ။	ផ្លែប៉ោម	ផ្លែប៉ោមនេះពណ៌ក្រហម។
April	এপ্রিল	আমার জন্মদিন এপ্রিল মাসে।	Abril	Sa Abril ang kaarawan ko.	ဧပြီလ	ကျွန်တော့်မွေးနေ့က ဧပြီလမှာပါ။	ខែមេសា	ថ្ងៃកំណើតរបស់ខ្ញុំនៅខែមេសា។
area	এলাকা; ক্ষেত্র	এই এলাকাটি শান্ত।	lugar; bahagi	Tahimik ang lugar na ito.	ဒေသ; ဧရိယာ	ဒီဒေသက တိတ်ဆိတ်တယ်။	តំបន់	តំបន់នេះស្ងប់ស្ងាត់។
arm	বাহু	আমার বাহু ব্যথা করছে।	braso	Masakit ang braso ko.	လက်မောင်း	ကျွန်တော့်လက်မောင်းနာတယ်။	ដៃ	ដៃរបស់ខ្ញុំឈឺ។
around	চারপাশে; প্রায়	আমরা পার্কের চারপাশে হাঁটি।	sa paligid	Naglalakad kami sa paligid ng parke.	ပတ်လည်; အနီးအနား	ကျွန်တော်တို့ ဥယျာဉ်ပတ်လည်လမ်းလျှောက်တယ်။	ជុំវិញ	យើងដើរជុំវិញសួន។
arrive	পৌঁছানো	তারা ছয়টায় পৌঁছায়।	dumating	Dumarating sila nang alas sais.	ရောက်လာသည်	သူတို့ ခြောက်နာရီမှာရောက်တယ်။	មកដល់	ពួកគេមកដល់ម៉ោងប្រាំមួយ។
art	শিল্প	আমার শিল্প ভালো লাগে।	sining	Gusto ko ang sining.	အနုပညာ	ကျွန်တော် အနုပညာကိုကြိုက်တယ်။	សិល្បៈ	ខ្ញុំចូលចិត្តសិល្បៈ។
article	প্রবন্ধ; নিবন্ধ	আমি অনলাইনে একটি নিবন্ধ পড়ি।	artikulo	Nagbasa ako ng artikulo online.	ဆောင်းပါး	ကျွန်တော် အွန်လိုင်းမှာ ဆောင်းပါးဖတ်တယ်။	អត្ថបទ	ខ្ញុំអានអត្ថបទតាមអ៊ីនធឺណិត។
artist	শিল্পী	শিল্পী একটি মুখ আঁকেন।	artista	Iginuguhit ng artista ang mukha.	အနုပညာရှင်	အနုပညာရှင်က မျက်နှာတစ်ခုဆွဲတယ်။	សិល្បករ	សិល្បករគូរមុខមួយ។
as	হিসেবে; যেমন	আমি শিক্ষক হিসেবে কাজ করি।	bilang	Nagtatrabaho ako bilang guro.	အဖြစ်; ကဲ့သို့	ကျွန်တော် ဆရာအဖြစ်အလုပ်လုပ်တယ်။	ជា; ដូចជា	ខ្ញុំធ្វើការជាគ្រូ។
ask	জিজ্ঞাসা করা; চাওয়া	এখন শিক্ষককে জিজ্ঞাসা করো।	magtanong; humingi	Magtanong ka sa guro ngayon.	မေးသည်; တောင်းသည်	အခု ဆရာကိုမေးပါ။	សួរ; ស្នើសុំ	សួរគ្រូឥឡូវនេះ។
at	এ; কাছে	আমি বাড়িতে আছি।	sa; nasa	Nasa bahay ako.	မှာ; တွင်	ကျွန်တော် အိမ်မှာရှိတယ်။	នៅ; ត្រង់	ខ្ញុំនៅផ្ទះ។
August	আগস্ট	আমরা আগস্টে ভ্রমণ করি।	Agosto	Naglalakbay kami sa Agosto.	ဩဂုတ်လ	ကျွန်တော်တို့ ဩဂုတ်လမှာခရီးသွားတယ်။	ខែសីហា	យើងធ្វើដំណើរនៅខែសីហា។
aunt	খালা; পিসি	আমার খালা এখানে থাকেন।	tiya	Nakatira rito ang tiya ko.	အဒေါ်	ကျွန်တော့်အဒေါ် ဒီမှာနေတယ်။	មីង	មីងរបស់ខ្ញុំរស់នៅទីនេះ។
autumn	শরৎ	শরতে পাতা ঝরে।	taglagas	Nalalaglag ang mga dahon sa taglagas.	ဆောင်းဦးရာသီ	ဆောင်းဦးမှာ အရွက်တွေကြွေတယ်။	រដូវស្លឹកឈើជ្រុះ	ស្លឹកឈើជ្រុះនៅរដូវស្លឹកឈើជ្រុះ។
away	দূরে	বাসটি দূরে চলে যায়।	palayo	Umaalis palayo ang bus.	အဝေးသို့	ဘတ်စ်ကားက ထွက်သွားတယ်။	ចេញឆ្ងាយ	ឡានក្រុងចេញទៅឆ្ងាយ។
baby	শিশু	শিশুটি ঘুমাচ্ছে।	sanggol	Natutulog ang sanggol.	ကလေးငယ်	ကလေးငယ် အိပ်နေတယ်။	ទារក	ទារកកំពុងគេង។
back	পিঠ; ফিরে	আমার পিঠ ব্যথা করছে।	likod; pabalik	Masakit ang likod ko.	နောက်ကျော; ပြန်	ကျွန်တော့်နောက်ကျောနာတယ်။	ខ្នង; ត្រឡប់ក្រោយ	ខ្នងរបស់ខ្ញុំឈឺ។
bad	খারাপ	এই দুধ খারাপ।	masama; sira	Sira ang gatas na ito.	မကောင်းသော; ပျက်သော	ဒီနို့က ပျက်နေတယ်။	អាក្រក់; ខូច	ទឹកដោះគោនេះខូច។
bag	ব্যাগ	তোমার ব্যাগ চেয়ারের উপর আছে।	bag; supot	Nasa upuan ang bag mo.	အိတ်	မင်းအိတ်က ကုလားထိုင်ပေါ်မှာရှိတယ်။	កាបូប	កាបូបរបស់អ្នកនៅលើកៅអី។
ball	বল	বলটি টেবিলের নিচে।	bola	Nasa ilalim ng mesa ang bola.	ဘောလုံး	ဘောလုံးက စားပွဲအောက်မှာရှိတယ်။	បាល់	បាល់នៅក្រោមតុ។
banana	কলা	আমি কলা খাই।	saging	Kumakain ako ng saging.	ငှက်ပျောသီး	ကျွန်တော် ငှက်ပျောသီးစားတယ်။	ចេក	ខ្ញុំញ៉ាំចេក។
band	ব্যান্ড; দল	ব্যান্ডটি গান বাজায়।	banda	Tumutugtog ng musika ang banda.	တီးဝိုင်း	တီးဝိုင်းက တေးဂီတတီးတယ်။	ក្រុមតន្ត្រី	ក្រុមតន្ត្រីលេងតន្ត្រី។
bank (money)	ব্যাংক	ব্যাংকটি নয়টায় খোলে।	bangko	Nagbubukas ang bangko nang alas nuwebe.	ဘဏ်	ဘဏ်က ကိုးနာရီမှာဖွင့်တယ်။	ធនាគារ	ធនាគារបើកម៉ោងប្រាំបួន។
bath	স্নান; গোসল	আমি রাতে গোসল করি।	paligo; paliguan	Naliligo ako sa gabi.	ရေချိုးခြင်း	ကျွန်တော် ညမှာရေချိုးတယ်။	ការងូតទឹក	ខ្ញុំងូតទឹកពេលយប់។
bathroom	বাথরুম	বাথরুমটি পরিষ্কার।	banyo	Malinis ang banyo.	ရေချိုးခန်း	ရေချိုးခန်းက သန့်ရှင်းတယ်။	បន្ទប់ទឹក	បន្ទប់ទឹកស្អាត។
be	হওয়া	আমি খুশি।	maging; ay	Masaya ako.	ဖြစ်သည်	ကျွန်တော် ပျော်နေတယ်။	ជា	ខ្ញុំសប្បាយចិត្ត។
beach	সমুদ্র সৈকত	আমরা সৈকতে বসি।	dalampasigan	Nakaupo kami sa dalampasigan.	ကမ်းခြေ	ကျွန်တော်တို့ ကမ်းခြေမှာထိုင်တယ်။	ឆ្នេរ	យើងអង្គុយនៅឆ្នេរ។
beautiful	সুন্দর	ফুলটি সুন্দর।	maganda	Maganda ang bulaklak.	လှသော	ပန်းက လှတယ်။	ស្អាត	ផ្កាស្អាត។
because	কারণ	আমি অসুস্থ বলে বাড়িতে থাকি।	dahil	Nananatili ako sa bahay dahil may sakit ako.	ဘာကြောင့်လဲဆိုတော့	ကျွန်တော် နေမကောင်းလို့ အိမ်မှာနေတယ်။	ព្រោះ	ខ្ញុំនៅផ្ទះព្រោះខ្ញុំឈឺ។
become	হয়ে ওঠা	এটি ঠান্ডা হতে পারে।	maging	Maaaring maging malamig ito.	ဖြစ်လာသည်	ဒါက အေးလာနိုင်တယ်။	ក្លាយជា	វាអាចក្លាយជាត្រជាក់។
bed	বিছানা	বিছানাটি বড়।	kama	Malaki ang kama.	အိပ်ရာ	အိပ်ရာက ကြီးတယ်။	គ្រែ	គ្រែធំ។
bedroom	শোবার ঘর	আমার শোবার ঘর শান্ত।	silid-tulugan	Tahimik ang silid-tulugan ko.	အိပ်ခန်း	ကျွန်တော့်အိပ်ခန်းက တိတ်ဆိတ်တယ်။	បន្ទប់គេង	បន្ទប់គេងរបស់ខ្ញុំស្ងាត់។
beer	বিয়ার	সে রাতের খাবারের সঙ্গে বিয়ার পান করে।	serbesa	Umiinom siya ng serbesa kasama ng hapunan.	ဘီယာ	သူ ညစာနဲ့ ဘီယာသောက်တယ်။	ស្រាបៀរ	គាត់ផឹកស្រាបៀរជាមួយអាហារពេលល្ងាច។
before	আগে	দুপুরের খাবারের আগে হাত ধোও।	bago	Hugasan mo ang kamay bago magtanghalian.	မတိုင်မီ	နေ့လယ်စာမစားခင် လက်ဆေးပါ။	មុន	លាងដៃមុនអាហារថ្ងៃត្រង់។
begin	শুরু করা	এখন পরীক্ষা শুরু করো।	magsimula	Simulan mo na ang pagsusulit ngayon.	စတင်သည်	စာမေးပွဲကို အခုစပါ။	ចាប់ផ្តើម	ចាប់ផ្តើមតេស្តឥឡូវនេះ។
beginning	শুরু	শুরুটা সহজ।	simula	Madali ang simula.	အစ	အစက လွယ်တယ်။	ការចាប់ផ្តើម	ការចាប់ផ្តើមងាយស្រួល។
behind	পেছনে	বিড়ালটি সোফার পেছনে।	sa likod	Nasa likod ng sofa ang pusa.	နောက်မှာ	ကြောင်က ဆိုဖာနောက်မှာရှိတယ်။	នៅខាងក្រោយ	ឆ្មានៅខាងក្រោយសាឡុង។
believe	বিশ্বাস করা	আমি তোমাকে বিশ্বাস করি।	maniwala	Naniniwala ako sa iyo.	ယုံကြည်သည်	ကျွန်တော် မင်းကိုယုံတယ်။	ជឿ	ខ្ញុំជឿអ្នក។
below	নিচে	নামটি ছবির নিচে।	sa ibaba	Nasa ibaba ng larawan ang pangalan.	အောက်မှာ	နာမည်က ပုံအောက်မှာရှိတယ်။	នៅខាងក្រោម	ឈ្មោះនៅខាងក្រោមរូបភាព។
best	সেরা	সে আমার সেরা বন্ধু।	pinakamahusay	Matalik ko siyang kaibigan.	အကောင်းဆုံး	သူမက ကျွန်တော့်အကောင်းဆုံးသူငယ်ချင်းပါ။	ល្អបំផុត	នាងជាមិត្តល្អបំផុតរបស់ខ្ញុំ។
better	আরও ভালো	আজ আমি আরও ভালো বোধ করছি।	mas mabuti	Mas mabuti ang pakiramdam ko ngayon.	ပိုကောင်းသော	ဒီနေ့ ကျွန်တော် ပိုကောင်းတယ်လို့ခံစားရတယ်။	ប្រសើរជាង	ថ្ងៃនេះខ្ញុំមានអារម្មណ៍ប្រសើរជាងមុន។
between	মধ্যে	ক্যাফেটি দুটি দোকানের মধ্যে।	sa pagitan	Nasa pagitan ng dalawang tindahan ang cafe.	ကြားမှာ	ကဖေးက ဆိုင်နှစ်ဆိုင်ကြားမှာရှိတယ်။	នៅចន្លោះ	កាហ្វេនៅចន្លោះហាងពីរ។
bicycle	সাইকেল	আমার সাইকেল নীল।	bisikleta	Asul ang bisikleta ko.	စက်ဘီး	ကျွန်တော့်စက်ဘီးက အပြာရောင်ပါ။	កង់	កង់របស់ខ្ញុំពណ៌ខៀវ។
big	বড়	এই বাক্সটি বড়।	malaki	Malaki ang kahong ito.	ကြီးသော	ဒီသေတ္တာက ကြီးတယ်။	ធំ	ប្រអប់នេះធំ។
bike	বাইক; সাইকেল	আমি সাইকেল চালাই।	bisikleta	Nagbibisikleta ako.	စက်ဘီး	ကျွန်တော် စက်ဘီးစီးတယ်။	កង់	ខ្ញុំជិះកង់។
bill	বিল	বিলটি টেবিলের উপর।	bayarin	Nasa mesa ang bayarin.	ငွေတောင်းခံလွှာ	ဘီလ်က စားပွဲပေါ်မှာရှိတယ်။	វិក័យបត្រ	វិក័យបត្រនៅលើតុ។
bird	পাখি	গাছে একটি পাখি আছে।	ibon	Nasa puno ang isang ibon.	ငှက်	သစ်ပင်ပေါ်မှာ ငှက်တစ်ကောင်ရှိတယ်။	បក្សី	មានបក្សីមួយនៅលើដើមឈើ។
birthday	জন্মদিন	আজ আমার জন্মদিন।	kaarawan	Kaarawan ko ngayon.	မွေးနေ့	ဒီနေ့ ကျွန်တော့်မွေးနေ့ပါ။	ថ្ងៃកំណើត	ថ្ងៃនេះជាថ្ងៃកំណើតរបស់ខ្ញុំ។
black	কালো	আমার ব্যাগ কালো।	itim	Itim ang bag ko.	အနက်ရောင်	ကျွန်တော့်အိတ်က အနက်ရောင်ပါ။	ខ្មៅ	កាបូបរបស់ខ្ញុំពណ៌ខ្មៅ។
blog	ব্লগ	সে ব্লগ লেখে।	blog	Nagsusulat siya ng blog.	ဘလော့ဂ်	သူမ ဘလော့ဂ်ရေးတယ်။	ប្លុក	នាងសរសេរប្លុក។
blonde	সোনালি চুলের	তার সোনালি চুল আছে।	blonde; dilaw ang buhok	Blonde ang buhok niya.	ရွှေရောင်ဆံပင်ရှိသော	သူ့မှာ ရွှေရောင်ဆံပင်ရှိတယ်။	សក់ពណ៌ទង់ដែង	គាត់មានសក់ពណ៌ទង់ដែង។
blue	নীল	আকাশ নীল।	asul	Asul ang langit.	အပြာရောင်	ကောင်းကင်က အပြာရောင်ပါ။	ខៀវ	មេឃពណ៌ខៀវ។
boat	নৌকা	নৌকাটি জলে আছে।	bangka	Nasa tubig ang bangka.	လှေ	လှေက ရေပေါ်မှာရှိတယ်။	ទូក	ទូកនៅលើទឹក។
body	শরীর	আমার শরীর ক্লান্ত।	katawan	Pagod ang katawan ko.	ခန္ဓာကိုယ်	ကျွန်တော့်ခန္ဓာကိုယ် ပင်ပန်းနေတယ်။	រាងកាយ	រាងកាយរបស់ខ្ញុំហត់។
book	বই	আমি একটি বই পড়ি।	libro	Nagbabasá ako ng libro.	စာအုပ်	ကျွန်တော် စာအုပ်ဖတ်တယ်။	សៀវភៅ	ខ្ញុំអានសៀវភៅ។
boot	বুট	একটি বুট বিছানার নিচে।	bota	Nasa ilalim ng kama ang isang bota.	ဘွတ်ဖိနပ်	ဘွတ်ဖိနပ်တစ်ဖက်က အိပ်ရာအောက်မှာရှိတယ်။	ស្បែកជើងកវែង	ស្បែកជើងកវែងមួយនៅក្រោមគ្រែ។
bored	বিরক্ত; একঘেয়ে লাগছে	আমার বিরক্ত লাগছে।	nababagot	Nababagot ako.	ပျင်းသော	ကျွန်တော် ပျင်းနေတယ်။	ធុញទ្រាន់	ខ្ញុំធុញទ្រាន់។
boring	একঘেয়ে	এই ছবিটি একঘেয়ে।	nakakabagot	Nakakabagot ang pelikulang ito.	ပျင်းစရာကောင်းသော	ဒီရုပ်ရှင်က ပျင်းစရာကောင်းတယ်။	គួរឱ្យធុញ	ខ្សែភាពយន្តនេះគួរឱ្យធុញ។
born	জন্মগ্রহণ করা	আমার জন্ম মে মাসে।	ipinanganak	Ipinanganak ako noong Mayo.	မွေးဖွားသော	ကျွန်တော် မေလမှာမွေးခဲ့တယ်။	កើត	ខ្ញុំកើតនៅខែឧសភា។
both	দুজনেই; উভয়	দুই মেয়েই খুশি।	pareho	Parehong masaya ang dalawang babae.	နှစ်ခုလုံး	မိန်းကလေးနှစ်ယောက်လုံး ပျော်နေတယ်။	ទាំងពីរ	ក្មេងស្រីទាំងពីរសប្បាយចិត្ត។
bottle	বোতল	বোতলটি ভরা।	bote	Puno ang bote.	ပုလင်း	ပုလင်းက ပြည့်နေတယ်။	ដប	ដបពេញ។
box	বাক্স	বাক্সটি খোলা।	kahon	Bukas ang kahon.	သေတ္တာ	သေတ္တာက ဖွင့်ထားတယ်။	ប្រអប់	ប្រអប់បើក។
boy	ছেলে	ছেলেটি দ্রুত দৌড়ায়।	batang lalaki	Mabilis tumakbo ang batang lalaki.	ယောက်ျားလေး	ယောက်ျားလေးက မြန်မြန်ပြေးတယ်။	ក្មេងប្រុស	ក្មេងប្រុសរត់លឿន។
boyfriend	প্রেমিক	তার প্রেমিক দয়ালু।	kasintahang lalaki	Mabait ang kasintahan niyang lalaki.	ချစ်သူအမျိုးသား	သူမရဲ့ချစ်သူက သဘောကောင်းတယ်။	មិត្តប្រុស	មិត្តប្រុសរបស់នាងចិត្តល្អ។
bread	রুটি	আমি রুটি চাই।	tinapay	Gusto ko ng tinapay.	ပေါင်မုန့်	ကျွန်တော် ပေါင်မုန့်လိုချင်တယ်။	នំប៉័ង	ខ្ញុំចង់បាននំប៉័ង។
break	ভাঙা	কাপটি ভেঙো না।	basagin	Huwag mong basagin ang tasa.	ချိုးသည်; ကွဲသည်	ခွက်ကို မချိုးပါနဲ့။	បំបែក	កុំបំបែកពែង។
breakfast	নাশতা	নাশতা তৈরি।	almusal	Handa na ang almusal.	မနက်စာ	မနက်စာ အဆင်သင့်ဖြစ်ပြီ။	អាហារពេលព្រឹក	អាហារពេលព្រឹករួចរាល់ហើយ។
bring	নিয়ে আসা	তোমার বই নিয়ে এসো।	dalhin	Dalhin mo ang libro mo.	ယူလာသည်	မင်းစာအုပ်ယူလာပါ။	យកមក	យកសៀវភៅរបស់អ្នកមក។
brother	ভাই	আমার ভাই লম্বা।	kapatid na lalaki	Matangkad ang kapatid kong lalaki.	အစ်ကို; ညီ	ကျွန်တော့်အစ်ကိုက အရပ်ရှည်တယ်။	បងប្រុស; ប្អូនប្រុស	បងប្រុសរបស់ខ្ញុំខ្ពស់។
brown	বাদামি	কুকুরটি বাদামি।	kayumanggi	Kayumanggi ang aso.	အညိုရောင်	ခွေးက အညိုရောင်ပါ။	ត្នោត	ឆ្កែពណ៌ត្នោត។
build	তৈরি করা; নির্মাণ করা	তারা একটি বাড়ি তৈরি করে।	magtayo; bumuo	Nagtatayo sila ng bahay.	ဆောက်သည်	သူတို့ အိမ်ဆောက်တယ်။	សាងសង់	ពួកគេសាងសង់ផ្ទះ។
building	ভবন	এই ভবনটি পুরোনো।	gusali	Luma ang gusaling ito.	အဆောက်အအုံ	ဒီအဆောက်အအုံက ဟောင်းတယ်။	អគារ	អគារនេះចាស់។
bus	বাস	বাসটি দেরি করছে।	bus	Huli ang bus.	ဘတ်စ်ကား	ဘတ်စ်ကား နောက်ကျတယ်။	ឡានក្រុង	ឡានក្រុងមកយឺត។
business	ব্যবসা	আমার বাবার ব্যবসা আছে।	negosyo	May negosyo ang ama ko.	စီးပွားရေးလုပ်ငန်း	ကျွန်တော့်အဖေမှာ စီးပွားရေးလုပ်ငန်းရှိတယ်။	អាជីវកម្ម	ឪពុករបស់ខ្ញុំមានអាជីវកម្ម។
busy	ব্যস্ত	আজ আমি ব্যস্ত।	abala	Abala ako ngayon.	အလုပ်များသော	ဒီနေ့ ကျွန်တော် အလုပ်များတယ်။	រវល់	ថ្ងៃនេះខ្ញុំរវល់។
but	কিন্তু	আমার চা ভালো লাগে, কিন্তু কফি নয়।	pero	Gusto ko ang tsaa, pero hindi ang kape.	ဒါပေမဲ့	ကျွန်တော် လက်ဖက်ရည်ကြိုက်တယ်၊ ဒါပေမဲ့ ကော်ဖီမကြိုက်ဘူး။	ប៉ុន្តែ	ខ្ញុំចូលចិត្តតែ ប៉ុន្តែមិនចូលចិត្តកាហ្វេទេ។
butter	মাখন	রুটির উপর মাখন লাগাও।	mantikilya	Lagyan mo ng mantikilya ang tinapay.	ထောပတ်	ပေါင်မုန့်ပေါ်မှာ ထောပတ်တင်ပါ။	ប៊ឺ	ដាក់ប៊ឺលើនំប៉័ង។
buy	কেনা	আমি দুধ কিনি।	bumili	Bumibili ako ng gatas.	ဝယ်သည်	ကျွန်တော် နို့ဝယ်တယ်။	ទិញ	ខ្ញុំទិញទឹកដោះគោ។
by	কাছে; দ্বারা	জানালার কাছে বসো।	sa tabi; sa pamamagitan ng	Umupo ka sa tabi ng bintana.	အနားမှာ; ဖြင့်	ပြတင်းပေါက်အနားမှာထိုင်ပါ။	ក្បែរ; ដោយ	អង្គុយក្បែរបង្អួច។
bye	বিদায়; বাই	বিদায়, কাল দেখা হবে।	paalam	Paalam, magkita tayo bukas.	နှုတ်ဆက်ပါတယ်	နှုတ်ဆက်ပါတယ်၊ မနက်ဖြန်တွေ့မယ်။	លាហើយ	លាហើយ ជួបគ្នាថ្ងៃស្អែក។
cafe	ক্যাফে	আমরা ক্যাফেতে দেখা করি।	kapihan	Nagkikita kami sa kapihan.	ကဖေး	ကျွန်တော်တို့ ကဖေးမှာတွေ့တယ်။	កាហ្វេ	យើងជួបគ្នានៅកាហ្វេ។
cake	কেক	কেকটি মিষ্টি।	keyk	Matamis ang cake.	ကိတ်မုန့်	ကိတ်မုန့်က ချိုတယ်။	នំខេក	នំខេកផ្អែម។
call	ফোন করা; ডাকা	দয়া করে আমাকে ফোন করো।	tumawag; tawagin	Tawagan mo ako, pakiusap.	ဖုန်းခေါ်သည်; ခေါ်သည်	ကျေးဇူးပြု၍ ကျွန်တော့်ကိုဖုန်းခေါ်ပါ။	ទូរស័ព្ទ; ហៅ	សូមទូរស័ព្ទមកខ្ញុំ។
camera	ক্যামেরা	আমার ক্যামেরা নতুন।	kamera	Bago ang kamera ko.	ကင်မရာ	ကျွန်တော့်ကင်မရာက အသစ်ပါ။	កាមេរ៉ា	កាមេរ៉ារបស់ខ្ញុំថ្មី។
can1 modal	পারা	আমি সাঁতার কাটতে পারি।	maaari; kaya	Marunong akong lumangoy.	နိုင်သည်	ကျွန်တော် ရေကူးနိုင်တယ်။	អាច	ខ្ញុំអាចហែលទឹកបាន។
cannot	পারতে না	আমি আজ আসতে পারি না।	hindi maaari; hindi kaya	Hindi ako makakapunta ngayon.	မနိုင်; မရ	ဒီနေ့ ကျွန်တော် မလာနိုင်ဘူး။	មិនអាច	ថ្ងៃនេះខ្ញុំមិនអាចមកបានទេ។
capital	রাজধানী	প্যারিস একটি রাজধানী।	kabisera	Kabisera ang Paris.	မြို့တော်	ပါရီက မြို့တော်ပါ။	រាជធានី	ប៉ារីសជារាជធានី។
car	গাড়ি	গাড়িটি লাল।	kotse	Pula ang kotse.	ကား	ကားက အနီရောင်ပါ။	ឡាន	ឡានពណ៌ក្រហម។
card	কার্ড	আমার একটি জন্মদিনের কার্ড আছে।	card; tarheta	May birthday card ako.	ကတ်	ကျွန်တော့်မှာ မွေးနေ့ကတ်ရှိတယ်။	កាត	ខ្ញុំមានកាតថ្ងៃកំណើត។
career	কর্মজীবন	আমি শিল্পে কর্মজীবন চাই।	karera	Gusto ko ng karera sa sining.	အလုပ်အကိုင်လမ်းကြောင်း	ကျွန်တော် အနုပညာမှာအလုပ်အကိုင်လမ်းကြောင်းလိုချင်တယ်။	អាជីព	ខ្ញុំចង់បានអាជីពក្នុងសិល្បៈ។
carrot	গাজর	গাজরটি কমলা রঙের।	karot	Kahel ang karot.	မုန်လာဥနီ	မုန်လာဥနီက လိမ္မော်ရောင်ပါ။	ការ៉ុត	ការ៉ុតពណ៌ទឹកក្រូច។
carry	বহন করা	আমি আমার ব্যাগ বহন করি।	buhatin; dalhin	Dala ko ang bag ko.	သယ်သည်	ကျွန်တော် အိတ်ကိုသယ်တယ်။	យួរ; កាន់	ខ្ញុំយួរកាបូបរបស់ខ្ញុំ។
cat	বিড়াল	বিড়ালটি ঘুমায়।	pusa	Natutulog ang pusa.	ကြောင်	ကြောင် အိပ်တယ်။	ឆ្មា	ឆ្មាគេង។
CD	সিডি; ডিস্ক	এই ডিস্কে গান আছে।	CD; disk	May musika ang disk na ito.	စီဒီ; ဒစ်	ဒီဒစ်ထဲမှာ တေးဂီတရှိတယ်။	ស៊ីឌី; ឌីស	ឌីសនេះមានតន្ត្រី។
cent	সেন্ট	এক সেন্ট খুব ছোট।	sentimo	Napakaliit ng isang sentimo.	ဆင့်	တစ်ဆင့်က အလွန်သေးတယ်။	សេន	មួយសេនតូចណាស់។
centre	কেন্দ্র	শহরের কেন্দ্র ব্যস্ত।	sentro	Abala ang sentro ng bayan.	ဗဟို; အလယ်	မြို့လယ်က အလုပ်များတယ်။	កណ្តាល; មជ្ឈមណ្ឌល	កណ្តាលទីក្រុងរវល់។
century	শতাব্দী	এক শতাব্দী একশ বছর।	siglo	Ang isang siglo ay isang daang taon.	ရာစုနှစ်	ရာစုနှစ်တစ်ခုက နှစ်တစ်ရာပါ။	សតវត្សរ៍	សតវត្សរ៍មួយគឺមួយរយឆ្នាំ។
chair	চেয়ার	চেয়ারে বসো।	upuan	Umupo ka sa upuan.	ကုလားထိုင်	ကုလားထိုင်ပေါ်မှာထိုင်ပါ။	កៅអី	អង្គុយលើកៅអី។
change	বদলানো	আমি পোশাক বদলাই।	magpalit; baguhin	Nagpapalit ako ng damit.	ပြောင်းသည်; လဲသည်	ကျွန်တော် အဝတ်လဲတယ်။	ផ្លាស់ប្តូរ	ខ្ញុំប្តូរសម្លៀកបំពាក់។
chart	চার্ট; চিত্র	চার্টটি দেখো।	tsart; talahanayan	Tingnan mo ang tsart.	ဇယား; ပုံပြ	ဇယားကိုကြည့်ပါ။	តារាង; គំនូសតាង	មើលតារាង។
cheap	সস্তা	এই শার্টটি সস্তা।	mura	Mura ang kamisetang ito.	ဈေးချိုသော	ဒီရှပ်အင်္ကျီက ဈေးချိုတယ်။	ថោក	អាវនេះថោក។
check	পরীক্ষা করা	তোমার উত্তর পরীক্ষা করো।	suriin	Suriin mo ang sagot mo.	စစ်ဆေးသည်	မင်းအဖြေကို စစ်ဆေးပါ။	ពិនិត្យ	ពិនិត្យចម្លើយរបស់អ្នក។
cheese	পনির	আমার পনির ভালো লাগে।	keso	Gusto ko ang keso.	ချိစ်	ကျွန်တော် ချိစ်ကြိုက်တယ်။	ឈីស	ខ្ញុំចូលចិត្តឈីស។
chicken	মুরগি; মুরগির মাংস	আমরা রাতের খাবারে মুরগি খাই।	manok	Kumakain kami ng manok sa hapunan.	ကြက်; ကြက်သား	ကျွန်တော်တို့ ညစာမှာ ကြက်သားစားတယ်။	មាន់; សាច់មាន់	យើងញ៉ាំសាច់មាន់ពេលល្ងាច។
child	শিশু; বাচ্চা	শিশুটি খুশি।	bata	Masaya ang bata.	ကလေး	ကလေးက ပျော်နေတယ်။	ក្មេង	ក្មេងសប្បាយចិត្ត។
chocolate	চকলেট	চকলেট মিষ্টি।	tsokolate	Matamis ang tsokolate.	ချောကလက်	ချောကလက်က ချိုတယ်။	សូកូឡា	សូកូឡាផ្អែម។
choose	বেছে নেওয়া	একটি উত্তর বেছে নাও।	pumili	Pumili ka ng isang sagot.	ရွေးချယ်သည်	အဖြေတစ်ခုကိုရွေးပါ။	ជ្រើសរើស	ជ្រើសរើសចម្លើយមួយ។
cinema	সিনেমা হল	আমরা সিনেমা হলে যাই।	sine	Pupunta kami sa sinehan.	ရုပ်ရှင်ရုံ	ကျွန်တော်တို့ ရုပ်ရှင်ရုံသွားတယ်။	រោងកុន	យើងទៅរោងកុន។
city	শহর	শহরটি বড়।	lungsod	Malaki ang lungsod.	မြို့	မြို့က ကြီးတယ်။	ទីក្រុង	ទីក្រុងធំ។
class	ক্লাস; শ্রেণি	ক্লাস নয়টায় শুরু হয়।	klase	Nagsisimula ang klase nang alas nuwebe.	အတန်း	အတန်းက ကိုးနာရီမှာစတယ်။	ថ្នាក់	ថ្នាក់ចាប់ផ្តើមម៉ោងប្រាំបួន។
classroom	শ্রেণিকক্ষ	শ্রেণিকক্ষটি শান্ত।	silid-aralan	Tahimik ang silid-aralan.	စာသင်ခန်း	စာသင်ခန်းက တိတ်ဆိတ်တယ်။	បន្ទប់រៀន	បន្ទប់រៀនស្ងាត់។
clean	পরিষ্কার; পরিষ্কার করা	ঘরটি পরিষ্কার।	malinis; linisin	Malinis ang silid.	သန့်ရှင်းသော; သန့်ရှင်းစေသည်	အခန်းက သန့်ရှင်းတယ်။	ស្អាត; សម្អាត	បន្ទប់ស្អាត។
climb	ওঠা; আরোহণ করা	তারা পাহাড়ে ওঠে।	umakyat	Umaakyat sila sa burol.	တက်သည်	သူတို့ တောင်ကုန်းပေါ်တက်တယ်။	ឡើង	ពួកគេឡើងភ្នំតូច។
clock	ঘড়ি	ঘড়িটি দেয়ালে আছে।	orasan	Nasa dingding ang orasan.	နာရီ	နာရီက နံရံပေါ်မှာရှိတယ်။	នាឡិកា	នាឡិកានៅលើជញ្ជាំង។
close1	বন্ধ করা	দয়া করে দরজা বন্ধ করো।	isara	Isara mo ang pinto, pakiusap.	ပိတ်သည်	ကျေးဇူးပြု၍ တံခါးပိတ်ပါ။	បិទ	សូមបិទទ្វារ។
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
            if language == "BN" and (not BENGALI_RE.search(display) or not BENGALI_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Bengali script")
            if language == "MY" and (not MYANMAR_RE.search(display) or not MYANMAR_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Myanmar script")
            if language == "KM" and (not KHMER_RE.search(display) or not KHMER_RE.search(example)):
                problems.append(f"{source_headword}/{language}: missing Khmer script")
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
    parser.add_argument("--batch-id", default="bn_tl_my_km_v1")
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
        "- Validation: exact source-row coverage, non-empty display/example cells, sentence punctuation, BN Bengali script, MY Myanmar script, KM Khmer script",
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
