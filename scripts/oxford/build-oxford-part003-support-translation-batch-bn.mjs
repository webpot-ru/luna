#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RELEASE_ID = "oxford_3000_core_a1_part_003_300_v1";
const SUMMARY_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_bn_v1_summary.md`;
const JSONL_PATH = `outputs/oxford-vocabulary/support-translations/${RELEASE_ID}_support_translation_batch_bn_v1.jsonl`;
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-bn.mjs";
const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "BN";
const BATCH_ID = "bn_v1";
const RELEASE_ENTRY_COUNT = 300;
const SENTENCE_END_RE = /[.!?।]$/u;
const BENGALI_RE = /\p{Script=Bengali}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u0963\u0966-\u097F\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1000-\u109F\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const BN_TRANSLATIONS_TSV = `source_headword	BN	example_BN
machine	মেশিন; যন্ত্র	এই মেশিন কফি বানায়।
magazine	পত্রিকা	সে সঙ্গীত পত্রিকা পড়ে।
main	প্রধান; মূল	এটি প্রধান দরজা।
make	বানানো; করা	আমি বাড়িতে দুপুরের খাবার বানাই।
man	পুরুষ; মানুষ	ওই মানুষটি আমার শিক্ষক।
many	অনেক; বহু	এখানে অনেক ছাত্র আছে।
map	মানচিত্র	মানচিত্রটি দেখো।
March	মার্চ	আমার জন্মদিন মার্চে।
market	বাজার	আমরা বাজার থেকে ফল কিনি।
married	বিবাহিত	আমার বোন বিবাহিত।
May	মে	স্কুল মে মাসে শেষ হয়।
maybe	হয়তো	হয়তো বৃষ্টি হবে।
me	আমাকে	দয়া করে আমাকে সাহায্য করো।
meal	খাবার; আহার	খাবারটি গরম।
mean	অর্থ হওয়া; বোঝানো	এই চিহ্নের অর্থ কী?
meaning	অর্থ	এর অর্থ কী?
meat	মাংস	আমি রাতে মাংস খাই।
meet	দেখা করা; মেলা	আমরা স্কুলের পরে দেখা করি।
meeting	সভা; মিটিং	সভা এখন শুরু হয়।
member	সদস্য	সে ক্লাবের সদস্য।
menu	মেনু; খাবারতালিকা	মেনুটি পড়ো।
message	বার্তা	আমি ছোট বার্তা পাঠাই।
metre	মিটার	এক মিটার সামনে যাও।
midnight	মধ্যরাত	ট্রেনটি মধ্যরাতে যায়।
mile	মাইল	আমরা এক মাইল হাঁটি।
milk	দুধ	আমি নাশতায় দুধ খাই।
million	দশ লাখ; মিলিয়ন	এখানে দশ লাখ মানুষ থাকে।
minute1	মিনিট	এক মিনিট অপেক্ষা করো।
miss	মিস করা; মনে পড়া	আমার পুরোনো স্কুলের কথা মনে পড়ে।
mistake	ভুল	উত্তরে ভুল আছে।
model	মডেল; নমুনা	এটি ছোট মডেল।
modern	আধুনিক	রান্নাঘরটি আধুনিক।
moment	মুহূর্ত; ক্ষণ	এক মুহূর্ত অপেক্ষা করো।
Monday	সোমবার	সোমবার আমরা কাজ শুরু করি।
money	টাকা	আমার একটু টাকা দরকার।
month	মাস	জুন গরম মাস।
more	আরও; বেশি	আমার আরও সময় দরকার।
morning	সকাল	আমি সকালে পড়ি।
most	অধিকাংশ; সবচেয়ে বেশি	অধিকাংশ ছাত্র গান পছন্দ করে।
mother	মা	আমার মা আজ কাজ করেন।
mountain	পাহাড়	পাহাড়টি খুব উঁচু।
mouse	ইঁদুর	ইঁদুরটি চেয়ারের নিচে।
mouth	মুখ	তোমার মুখ খোলো।
move	সরানো; চলা	চেয়ারটি এখানে সরাও।
movie	সিনেমা; চলচ্চিত্র	আজ রাতে আমরা সিনেমা দেখি।
much	অনেক; কত	এটার দাম কত?
mum	মা; মাম্মি	মা বাড়িতে আছেন।
museum	জাদুঘর	জাদুঘর দশটায় খোলে।
music	সঙ্গীত	আমি সঙ্গীত শুনি।
must modal	অবশ্যই করতে হবে; উচিত	তোমাকে এখানে থাকতে হবে।
my	আমার	এটি আমার বই।
name	নাম; নাম রাখা	এখানে তোমার নাম লেখো।
natural	প্রাকৃতিক; স্বাভাবিক	এই রস প্রাকৃতিক।
near	কাছে; নিকটে	ব্যাংক কাছে।
need	দরকার; প্রয়োজন	আমার কলম দরকার।
negative	নেতিবাচক	এই উত্তর নেতিবাচক।
neighbour	প্রতিবেশী	আমার প্রতিবেশী বন্ধুসুলভ।
never	কখনও না	আমি কখনও কফি খাই না।
new	নতুন	এই ফোনটি নতুন।
news	খবর; সংবাদ	আজকের খবর ভালো।
newspaper	সংবাদপত্র; পত্রিকা	সে সংবাদপত্র পড়ে।
next	পরের; আগামী	পরের বাস দেরি করছে।
next to	পাশে	আমার পাশে বসো।
nice	ভালো; সুন্দর	ঘরটি ভালো।
night	রাত	আমি রাতে ঘুমাই।
nine	নয়	এখানে নয়জন ছাত্র আছে।
nineteen	উনিশ	সে উনিশ বছর বয়সী।
ninety	নব্বই	আমার দাদু নব্বই বছর বয়সী।
no	না; নেই	না, ধন্যবাদ।
no one	কেউ নয়	ঘরে কেউ নেই।
nobody	কেউ নয়	বাড়িতে কেউ নেই।
north	উত্তর	স্টেশনটি উত্তরে।
nose	নাক	আমার নাক ঠান্ডা।
not	না	আমি ক্লান্ত নই।
note	নোট; মন্তব্য	এখন একটি নোট লেখো।
nothing	কিছুই নয়	বাক্সে কিছুই নেই।
November	নভেম্বর	আমার কোর্স নভেম্বরে শুরু হয়।
now	এখন; এখনই	এখনই এখানে আসো।
number	সংখ্যা; নম্বর	এখানে সংখ্যাটি লেখো।
nurse	নার্স	নার্সটি সদয়।
object	বস্তু; জিনিস	বস্তুটি টেবিলে রাখো।
o’clock	টা; বাজে	ক্লাস নয়টায় শুরু হয়।
October	অক্টোবর	আমরা অক্টোবরে ভ্রমণ করি।
of	এর; র	এটি চায়ের কাপ।
off	বন্ধ	বাতি বন্ধ করো।
office	অফিস; কার্যালয়	আমার অফিস ছোট।
often	প্রায়ই	আমি প্রায়ই হেঁটে স্কুলে যাই।
oh	ওহ; আরে	ওহ, এখন বুঝেছি।
OK	ঠিক আছে	এটা কি ঠিক আছে?
old	পুরোনো; বৃদ্ধ	এই বাড়িটি পুরোনো।
on	উপর; চালু	বইটি টেবিলের ওপর।
once	একবার	আমি সপ্তাহে একবার ফোন করি।
one	এক	আমার এক বোন আছে।
onion	পেঁয়াজ	একটি পেঁয়াজ কাটো।
online	অনলাইন	আমি অনলাইনে পড়ি।
only	শুধু; মাত্র	আমার কাছে মাত্র একটি ব্যাগ আছে।
open	খোলা; খোলা করা	জানালাটি খোলো।
opinion	মতামত	তোমার মতামত কী?
opposite	সামনে; বিপরীত	দোকানটি ব্যাংকের সামনে।
or	অথবা; বা	চা না কফি?
orange	কমলা; কমলা রঙ	কমলাটি মিষ্টি।
order	অর্ডার; আদেশ	আমি স্যুপ অর্ডার করি।
other	অন্য; অপর	অন্য দরজাটি ব্যবহার করো।
our	আমাদের	এটি আমাদের ক্লাস।
out	বাইরে	দুপুরের খাবারের পরে বাইরে যাও।
outside	বাইরে	শিশুরা বাইরে খেলে।
over	উপর দিয়ে; ওপরে	বিমানটি শহরের ওপর দিয়ে উড়ে।
own	নিজের	আমার নিজের ঘর আছে।
page	পৃষ্ঠা; পাতা	দশম পৃষ্ঠা খোলো।
paint	রং; রং করা	দেয়ালটি নীল রং করো।
painting	ছবি; চিত্রকর্ম	ছবিটি সুন্দর।
pair	জোড়া	আমার এক জোড়া মোজা দরকার।
paper	কাগজ; পেপার	এই কাগজে লেখো।
paragraph	অনুচ্ছেদ	প্রথম অনুচ্ছেদ পড়ো।
parent	বাবা-মা; অভিভাবক	একজন অভিভাবক বাইরে অপেক্ষা করেন।
park	পার্ক; গাড়ি রাখা	আমরা স্টেশনের কাছে গাড়ি রাখি।
part	অংশ; ভাগ	এই অংশটি সহজ।
partner	সঙ্গী; সহকর্মী	তোমার সঙ্গীর সঙ্গে কাজ করো।
party	পার্টি; অনুষ্ঠান	পার্টি সাতটায় শুরু হয়।
passport	পাসপোর্ট	পাসপোর্ট দেখাও।
past	অতীত; পেরিয়ে	সাড়ে ছয়টা বাজে।
pay	টাকা দেওয়া; পরিশোধ করা	আমি কার্ডে টাকা দিই।
pen	কলম	এই কলমটি নীল।
pencil	পেন্সিল	আমি পেন্সিল দিয়ে লিখি।
people	মানুষ; লোকজন	এখানে অনেক মানুষ আছে।
pepper	গোলমরিচ; মরিচ	স্যুপে গোলমরিচ দাও।
perfect	একদম ঠিক; নিখুঁত	তোমার উত্তর একদম ঠিক।
period	সময়কাল; পিরিয়ড	এই পিরিয়ডটি ছোট।
person	ব্যক্তি; মানুষ	একজন ব্যক্তি অপেক্ষা করছেন।
personal	ব্যক্তিগত	এটি আমার ব্যক্তিগত ফোন।
phone	ফোন; ফোন করা	আমার ফোন ব্যাগে।
photo	ছবি; ফটো	এখানে একটি ছবি তোলো।
photograph	ছবি; আলোকচিত্র	ছবিটি পুরোনো।
phrase	বাক্যাংশ	এই বাক্যাংশটি আবার বলো।
piano	পিয়ানো	সে পিয়ানো বাজায়।
picture	ছবি; চিত্র	ছবিটি দেখো।
piece	টুকরো	কেকের এক টুকরো নাও।
pig	শূকর	শূকরটি খামারে।
pink	গোলাপি	তার ব্যাগ গোলাপি।
place	জায়গা; স্থান	জায়গাটি শান্ত।
plan	পরিকল্পনা	আমাদের পরিকল্পনা দরকার।
plane	বিমান	বিমানটি দেরি করছে।
plant	গাছ; লাগানো	আজ গাছে পানি দাও।
play	খেলা; নাটক	শিশুরা পার্কে খেলে।
player	খেলোয়াড়	খেলোয়াড়টি দ্রুত দৌড়ায়।
please	দয়া করে	দয়া করে এখানে বসো।
point	বিন্দু; কথা	এই বিন্দুটি গুরুত্বপূর্ণ।
police	পুলিশ	পুলিশ বাইরে।
policeman	পুলিশকর্মী; পুলিশ	পুলিশকর্মী আমাদের সাহায্য করেন।
pool	পুল; জলাধার	পুলটি ঠান্ডা।
poor	দরিদ্র; গরিব	দরিদ্র শিশুটি ক্ষুধার্ত।
popular	জনপ্রিয়	গানটি জনপ্রিয়।
positive	ইতিবাচক	ফলাফল ইতিবাচক।
possible	সম্ভব	এটা কি আজ সম্ভব?
post	পোস্ট; ডাক	আমি অনলাইনে তার পোস্ট পড়ি।
potato	আলু	আমি একটি আলু খাই।
pound	পাউন্ড	এটার দাম এক পাউন্ড।
practice	অনুশীলন	প্রতিদিন অনুশীলন সাহায্য করে।
practise	অনুশীলন করা	আমি প্রতিদিন ইংরেজি অনুশীলন করি।
prefer	বেশি পছন্দ করা	আমি চা বেশি পছন্দ করি।
prepare	প্রস্তুত করা	সন্ধ্যায় ব্যাগ প্রস্তুত করো।
present	উপস্থিত; উপহার	সে আজ উপস্থিত।
pretty	সুন্দর; বেশ	বাগানটি সুন্দর।
price	দাম; মূল্য	দাম কম।
probably	সম্ভবত; হয়তো	সে সম্ভবত জানে।
problem	সমস্যা	সমস্যাটি ছোট।
product	পণ্য	পণ্যটি নতুন।
programme	অনুষ্ঠান; প্রোগ্রাম	অনুষ্ঠানটি এখন শুরু হয়।
project	প্রকল্প	আমাদের প্রকল্প শেষ।
purple	বেগুনি	জামাটি বেগুনি।
put	রাখা	বইটি এখানে রাখো।
quarter	এক-চতুর্থাংশ; পনেরো মিনিট	সোয়া দুইটা বাজে।
question	প্রশ্ন	প্রশ্ন করো।
quick	দ্রুত; ছোট	এটি ছোট পরীক্ষা।
quickly	দ্রুত	দ্রুত যাও।
quiet	শান্ত	লাইব্রেরি শান্ত।
quite	বেশ; যথেষ্ট	ঘরটি বেশ ছোট।
radio	রেডিও	রেডিওটি জোরে বাজছে।
rain	বৃষ্টি; বৃষ্টি হওয়া	এখন বৃষ্টি শুরু হয়।
read	পড়া	এই বাক্যটি পড়ো।
reader	পাঠক	পাঠক গল্পটি পছন্দ করে।
reading	পড়া; পাঠ	পড়া শেখায় সাহায্য করে।
ready	প্রস্তুত; তৈরি	রাতের খাবার প্রস্তুত।
real	আসল; বাস্তব	এটি আসল সমস্যা।
really	সত্যিই	গানটি আমার সত্যিই ভালো লাগে।
reason	কারণ	কারণটি বলো।
red	লাল	দরজাটি লাল।
relax	বিশ্রাম নেওয়া	কাজের পরে বিশ্রাম নাও।
remember	মনে রাখা	পাসপোর্ট মনে রেখো।
repeat	পুনরাবৃত্তি করা; আবার বলা	বাক্যটি আবার বলো।
report	প্রতিবেদন; রিপোর্ট	সন্ধ্যায় প্রতিবেদন পড়ো।
restaurant	রেস্তোরাঁ	রেস্তোরাঁটি ভরা।
result	ফলাফল	ফলাফল ভালো।
return	ফিরে আসা; ফেরত দেওয়া	বইটি কাল ফেরত দাও।
rice	ভাত; চাল	আমি দুপুরে ভাত খাই।
rich	ধনী	শহরটি ধনী।
ride	চড়া; চালানো	আমি সাইকেলে স্কুলে যাই।
right	ডান; সঠিক	এখানে ডানে ঘুরো।
river	নদী	নদীটি চওড়া।
road	রাস্তা	রাস্তাটি লম্বা।
room	ঘর; কক্ষ	আমার ঘর পরিষ্কার।
routine	দৈনন্দিন রুটিন	আমার রুটিন সকালে শুরু হয়।
rule	নিয়ম	নিয়মটি সহজ।
run	দৌড়ানো	আমি প্রতি সকালে দৌড়াই।
sad	দুঃখী	আজ আমি দুঃখী।
salad	সালাদ	সালাদটি তাজা।
salt	লবণ	একটু লবণ দাও।
same	একই; সমান	আমাদের একই ব্যাগ আছে।
sandwich	স্যান্ডউইচ	আমি স্যান্ডউইচ খাই।
Saturday	শনিবার	আমরা শনিবার দেখা করি।
say	বলা	তোমার নাম বলো।
school	স্কুল; বিদ্যালয়	আমার স্কুল কাছে।
science	বিজ্ঞান	আমি বিজ্ঞান পড়ি।
scientist	বিজ্ঞানী	বিজ্ঞানী প্রশ্ন করেন।
sea	সমুদ্র	সমুদ্র নীল।
second1 (unit of time)	সেকেন্ড	এক সেকেন্ড অপেক্ষা করো।
section	অংশ; বিভাগ	এই অংশটি পড়ো।
see	দেখা	আমি আমার বন্ধুকে দেখি।
sell	বিক্রি করা	তারা তাজা ফল বিক্রি করে।
send	পাঠানো	এখন বার্তা পাঠাও।
sentence	বাক্য	বাক্যটি লেখো।
September	সেপ্টেম্বর	স্কুল সেপ্টেম্বরে শুরু হয়।
seven	সাত	এখানে সাতজন মানুষ আছে।
seventeen	সতেরো	সে সতেরো বছর বয়সী।
seventy	সত্তর	আমার দিদা সত্তর বছর বয়সী।
share	ভাগ করা; শেয়ার করা	কেকটি ভাগ করো।
she	সে; নারী	সে আমার বোন।
sheep	ভেড়া	ভেড়াটি ঘাস খায়।
shirt	জামা; শার্ট	শার্টটি পরিষ্কার।
shoe	জুতো	জুতোটি বিছানার নিচে।
shop	দোকান; কেনাকাটা করা	দোকানটি তাড়াতাড়ি বন্ধ হয়।
shopping	কেনাকাটা	আজ কেনাকাটা মজার।
short	ছোট; কম	গল্পটি ছোট।
should modal	উচিত	তোমার আজ বিশ্রাম নেওয়া উচিত।
show	দেখানো; অনুষ্ঠান	মানচিত্রটি দেখাও।
shower	শাওয়ার; গোসল করা	আমি সকালে গোসল করি।
sick	অসুস্থ	আজ আমি অসুস্থ।
similar	মিল আছে; অনুরূপ	আমাদের ব্যাগ দুটির মিল আছে।
sing	গান গাওয়া	আমি ক্লাসে গান গাই।
singer	গায়ক; গায়িকা	গায়কটি বিখ্যাত।
sister	বোন	আমার বোন তরুণী।
sit	বসা	জানালার কাছে বসো।
situation	পরিস্থিতি	পরিস্থিতিটি নতুন।
six	ছয়	এখানে ছয়টি বই আছে।
sixteen	ষোল	সে ষোল বছর বয়সী।
sixty	ষাট	আমার বাবা ষাট বছর বয়সী।
skill	দক্ষতা	এই দক্ষতা দরকারি।
skirt	স্কার্ট	স্কার্টটি নীল।
sleep	ঘুমানো; ঘুম	আমি আট ঘণ্টা ঘুমাই।
slow	ধীর	বাসটি ধীর।
small	ছোট	ঘরটি ছোট।
snake	সাপ	সাপটি লম্বা।
snow	তুষার; তুষার পড়া	শীতে তুষার পড়ে।
so	তাই; এত	আমি ক্লান্ত, তাই বিশ্রাম নিই।
some	কিছু; একটু	আমার একটু পানি দরকার।
somebody	কেউ	দরজায় কেউ আছে।
someone	কেউ	কেউ বার্তা রেখে গেছে।
something	কিছু	আমার পান করার জন্য কিছু দরকার।
sometimes	কখনও কখনও	আমি কখনও কখনও হেঁটে স্কুলে যাই।
son	ছেলে; পুত্র	তার ছেলে স্কুলে।
song	গান	গানটি নতুন।
soon	শিগগির; তাড়াতাড়ি	আমরা শিগগির দেখা করব।
sorry	দুঃখিত; মাফ করবেন	আমি দুঃখিত।
sound	শব্দ; আওয়াজ	শব্দটি জোরে।
soup	স্যুপ	স্যুপটি গরম।
south	দক্ষিণ	হোটেলটি দক্ষিণে।
space	জায়গা; মহাকাশ	চেয়ারের জন্য জায়গা আছে।
speak	কথা বলা	দয়া করে ধীরে বলো।
special	বিশেষ	আজ বিশেষ দিন।
spell	বানান বলা	তোমার নামের বানান বলো।
spelling	বানান	বানানটি পরীক্ষা করো।
spend	খরচ করা; সময় কাটানো	আমি খাবারে টাকা খরচ করি।
sport	খেলা	ফুটবল জনপ্রিয় খেলা।
spring	বসন্ত; স্প্রিং	বসন্তে ফুল ফোটে।
stand	দাঁড়ানো	দরজার কাছে দাঁড়াও।
star	তারা	আমি উজ্জ্বল তারা দেখি।
start	শুরু করা; শুরু	ক্লাস এখন শুরু করো।
statement	বিবৃতি; বক্তব্য	বিবৃতিটি সঠিক।
station	স্টেশন	স্টেশন কাছে।
stay	থাকা; থামা	আজ বাড়িতে থাকো।
still	এখনও	আমি এখনও ক্ষুধার্ত।
stop	থামা; স্টপ	কোণে থামো।
story	গল্প	গল্পটি বলো।
street	রাস্তা; গলি	গলিটি শান্ত।
strong	শক্তিশালী	সে শক্তিশালী।
student	ছাত্র; শিক্ষার্থী	ছাত্রটি বই পড়ে।
study	পড়া; অধ্যয়ন করা	আমি ইংরেজি পড়ি।
style	শৈলী; স্টাইল	এই শৈলী আমার পছন্দ।
subject	বিষয়	ইংরেজি আমার বিষয়।
success	সফলতা; সাফল্য	সফলতার জন্য অনুশীলন দরকার।
sugar	চিনি	চায়ে চিনি দাও।
summer	গ্রীষ্ম; গরমকাল	এখানে গ্রীষ্ম গরম।
sun	সূর্য	সূর্য ঝলমল করে।
Sunday	রবিবার	আমরা রবিবার বিশ্রাম নিই।
supermarket	সুপারমার্কেট	সুপারমার্কেট খোলা।
sure	নিশ্চিত; অবশ্যই	আমি নিশ্চিত।
sweater	সোয়েটার	আমার সোয়েটার গরম।
swim	সাঁতার কাটা	আমি প্রতি সপ্তাহে সাঁতার কাটি।
swimming	সাঁতার	সাঁতার ভালো অনুশীলন।
table	টেবিল; মেজ	চাবিগুলো টেবিলে আছে।`;

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
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Bengali rows, found ${lines.length}`);
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
      throw new Error(`Bengali example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (!BENGALI_RE.test(display) || !BENGALI_RE.test(example)) {
      throw new Error(`Bengali display/example must contain Bengali text for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bengali display/example contains unexpected non-Bengali script for ${sourceHeadword}: ${display} / ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Bengali translation row for ${sourceHeadword}`);
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
    "Generate TL support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after TL.",
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
  const translations = parseTsv(BN_TRANSLATIONS_TSV);

  if (rows.length !== RELEASE_ENTRY_COUNT) {
    throw new Error(`Expected ${RELEASE_ENTRY_COUNT} Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Bengali translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Bengali translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(JSONL_PATH), { recursive: true });
  await writeFile(JSONL_PATH, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Bengali; display cells use Bengali script citation/base forms
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Script-aware validation: BN Bengali display/example cells, sentence punctuation and unexpected-script leakage guard
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
    next_language: "TL",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
