#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "MY";
const BATCH_ID = "my_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-my.mjs";
const SENTENCE_END_RE = /[.!?။]$/u;
const MYANMAR_RE = /\p{Script=Myanmar}/u;
const UNEXPECTED_SCRIPT_RE = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u1780-\u17FF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u;

const MY_TRANSLATIONS_TSV = `source_headword	MY	example_MY
take	ယူသည်; ယူဆောင်သွားသည်	လက်မှတ်ကို ယူပါ။
talk	စကားပြောသည်; စကားဝိုင်း	ကျွန်တော်တို့သည် အတန်းပြီးနောက် စကားပြောသည်။
tall	အရပ်ရှည်သော	ကျွန်တော်၏ဆရာသည် အရပ်ရှည်သည်။
taxi	တက္ကစီ	တက္ကစီသည် အပြင်တွင် ရှိသည်။
tea	လက်ဖက်ရည်	ဤလက်ဖက်ရည်သည် ပူသည်။
teach	သင်ကြားသည်; သင်ပေးသည်	ကျွန်တော်သည် အင်္ဂလိပ်စာ သင်ကြားသည်။
teacher	ဆရာ; ဆရာမ	ဆရာမသည် ပြုံးနေသည်။
team	အသင်း	ကျွန်တော်တို့အသင်းသည် ယနေ့ အနိုင်ရသည်။
teenager	ဆယ်ကျော်သက်	ဆယ်ကျော်သက်သည် စာအုပ်ဖတ်သည်။
telephone	တယ်လီဖုန်း; ဖုန်းဆက်သည်	ဖုန်းသည် စားပွဲပေါ်တွင် ရှိသည်။
television	ရုပ်မြင်သံကြား; တီဗီ	ရုပ်မြင်သံကြားသည် အသစ်ဖြစ်သည်။
tell	ပြောသည်; ပြောပြသည်	သင့်နာမည်ကို ကျွန်တော်ကို ပြောပါ။
ten	တစ်ဆယ်	ကျွန်တော်တွင် စာအုပ်တစ်ဆယ်အုပ် ရှိသည်။
tennis	တင်းနစ်	ယနေ့ ကျွန်တော်တို့သည် တင်းနစ်ကစားသည်။
terrible	ဆိုးရွားသော	ရာသီဥတုသည် ဆိုးရွားသည်။
test	စာမေးပွဲ; စမ်းသပ်မှု	စာမေးပွဲသည် ယခု စတင်သည်။
text	စာတို; စာသား	စာတိုတစ်စောင် ပို့ပါ။
than	ထက်	တစ်ဆယ်သည် နှစ်ထက် ပိုများသည်။
thank	ကျေးဇူးတင်သည်	သင့်ဆရာကို ကျေးဇူးတင်ပါ။
thanks	ကျေးဇူးတင်ပါတယ်	ကူညီမှုအတွက် ကျေးဇူးတင်ပါတယ်။
that	ထို; အဲဒီ	ထိုစာအုပ်သည် ကျွန်တော်၏စာအုပ်ဖြစ်သည်။
the	အင်္ဂလိပ် သတ်မှတ်ညွှန်ပြစကားလုံး	လက်ဖက်ရည်သည် ပူသည်။
theatre	ပြဇာတ်ရုံ	ပြဇာတ်ရုံသည် ဘူတာအနီးတွင် ရှိသည်။
their	သူတို့၏	သူတို့၏အိမ်သည် ကြီးသည်။
them	သူတို့ကို	ကျွန်တော်သည် သူတို့ကို သိသည်။
then	ထို့နောက်; အဲဒီအခါ	စားပါ၊ ထို့နောက် စာကျက်ပါ။
there	အဲဒီမှာ; ထိုနေရာတွင်	အဲဒီမှာ ကုလားထိုင်တစ်လုံး ရှိသည်။
they	သူတို့	သူတို့သည် ကျောင်းတွင် ရှိသည်။
thing	အရာ; ပစ္စည်း	ဤပစ္စည်းသည် အသုံးဝင်သည်။
think	စဉ်းစားသည်	ကျွန်တော်သည် အိမ်အကြောင်း စဉ်းစားသည်။
third	တတိယ; သုံးပုံတစ်ပုံ	ဤသည် တတိယသင်ခန်းစာဖြစ်သည်။
thirsty	ရေငတ်သော	ကျွန်တော်သည် ရေငတ်နေသည်။
thirteen	ဆယ့်သုံး	သူသည် ဆယ့်သုံးနှစ်ရှိသည်။
thirty	သုံးဆယ်	ကျွန်တော်၏အစ်မသည် သုံးဆယ်နှစ်ရှိသည်။
this	ဤ; ဒီ	ဤလက်မှတ်သည် အသစ်ဖြစ်သည်။
thousand	တစ်ထောင်	လူတစ်ထောင် ရောက်လာသည်။
three	သုံး	ကျွန်တော်သည် ငှက်သုံးကောင် မြင်သည်။
through	ဖြတ်၍; မှတစ်ဆင့်	ကျွန်တော်တို့သည် ပန်းခြံကို ဖြတ်၍ လမ်းလျှောက်သည်။
Thursday	ကြာသပတေးနေ့	ကျွန်တော်တို့သည် ကြာသပတေးနေ့တွင် တွေ့သည်။
ticket	လက်မှတ်	ကျွန်တော်သည် လက်မှတ်လိုသည်။
time	အချိန်; နာရီ	ယခု ဘယ်နှနာရီလဲ။
tired	ပင်ပန်းသော	ကျွန်တော်သည် ပင်ပန်းနေသည်။
title	ခေါင်းစဉ်	ခေါင်းစဉ်ကို ဖတ်ပါ။
to	သို့; အတွက်	ကျွန်တော်သည် အတန်းသို့ သွားသည်။
today	ယနေ့	ယနေ့ နေသာသည်။
together	အတူတူ	ကျွန်တော်တို့သည် အတူတူ စားသည်။
toilet	အိမ်သာ	အိမ်သာသည် သန့်ရှင်းသည်။
tomato	ခရမ်းချဉ်သီး	ဤခရမ်းချဉ်သီးသည် အနီရောင်ဖြစ်သည်။
tomorrow	မနက်ဖြန်	မနက်ဖြန် တွေ့ကြမယ်။
tonight	ယနေ့ည	ကျွန်တော်တို့သည် ယနေ့ည စာကျက်သည်။
too	လည်း; အရမ်း	ကျွန်တော်လည်း လက်ဖက်ရည်လိုသည်။
tooth	သွား	ကျွန်တော်၏သွား နာသည်။
topic	ခေါင်းစဉ်; အကြောင်းအရာ	ခေါင်းစဉ်ကို ရွေးပါ။
tourist	ခရီးသွားဧည့်သည်	ခရီးသွားဧည့်သည်သည် ဓာတ်ပုံရိုက်သည်။
town	မြို့; မြို့ငယ်	ဤမြို့ငယ်သည် တိတ်ဆိတ်သည်။
traffic	ယာဉ်ကြော	ယာဉ်ကြောသည် နှေးသည်။
train	ရထား	ရထားသည် နောက်ကျနေသည်။
travel	ခရီးသွားသည်; ခရီးသွားခြင်း	ကျွန်တော်တို့သည် ရထားဖြင့် ခရီးသွားသည်။
tree	သစ်ပင်	သစ်ပင်သည် မြင့်သည်။
trip	ခရီး	ခရီးသည် မနက်ဖြန် စတင်သည်။
trousers	ဘောင်းဘီ	ကျွန်တော်၏ဘောင်းဘီသည် အနက်ရောင်ဖြစ်သည်။
true	မှန်သော; တကယ့်	ဤပုံပြင်သည် မှန်သည်။
try	ကြိုးစားသည်; စမ်းကြည့်သည်	ဤလက်ဖက်ရည်ကို စမ်းကြည့်ပါ။
T-shirt	တီရှပ်	ကျွန်တော်သည် တီရှပ်ဝတ်ထားသည်။
Tuesday	အင်္ဂါနေ့	ကျွန်တော်တို့သည် အင်္ဂါနေ့တွင် တွေ့သည်။
turn	ကွေ့သည်; အလှည့်	ဤနေရာတွင် ဘယ်ဘက်သို့ ကွေ့ပါ။
TV	တီဗီ; ရုပ်မြင်သံကြား	တီဗီသည် အသံကျယ်သည်။
twelve	ဆယ့်နှစ်	ကျွန်တော်တွင် ခဲတံဆယ့်နှစ်ချောင်း ရှိသည်။
twenty	နှစ်ဆယ်	ကျောင်းသားနှစ်ဆယ် ဤနေရာတွင် ရှိသည်။
twice	နှစ်ကြိမ်	ကျွန်တော်သည် တစ်ပတ်လျှင် နှစ်ကြိမ် ရေကူးသည်။
two	နှစ်	လူနှစ်ယောက် စောင့်နေသည်။
type	အမျိုးအစား; ရိုက်ထည့်သည်	သင်သည် ဘယ်အမျိုးအစားဂီတကို လိုချင်သနည်း။
umbrella	ထီး	ထီးကို ယူပါ။
uncle	ဦးလေး; ဘကြီး	ကျွန်တော်၏ဦးလေးသည် ကြင်နာသည်။
under	အောက်တွင်	အိတ်သည် စားပွဲအောက်တွင် ရှိသည်။
understand	နားလည်သည်	ကျွန်တော်သည် မေးခွန်းကို နားလည်သည်။
university	တက္ကသိုလ်	တက္ကသိုလ်သည် အနီးတွင် ရှိသည်။
until	အထိ	ငါးနာရီအထိ စောင့်ပါ။
up	အပေါ်သို့; ထ	ယခု ထပါ။
upstairs	အပေါ်ထပ်တွင်	ကျွန်တော်၏အခန်းသည် အပေါ်ထပ်တွင် ရှိသည်။
us	ကျွန်တော်တို့ကို; ကျွန်မတို့ကို	ကျေးဇူးပြု၍ ကျွန်တော်တို့ကို ကူညီပါ။
use	အသုံးပြုသည်; အသုံးပြုခြင်း	ဤဘောပင်ကို အသုံးပြုပါ။
useful	အသုံးဝင်သော	ဤကတ်သည် အသုံးဝင်သည်။
usually	ပုံမှန်အားဖြင့်	ကျွန်တော်သည် ပုံမှန်အားဖြင့် အိမ်သို့ လမ်းလျှောက်သည်။
vacation	အားလပ်ရက်	ကျွန်တော်တို့၏အားလပ်ရက်သည် မနက်ဖြန် စတင်သည်။
vegetable	ဟင်းသီးဟင်းရွက်	မုန်လာဥသည် ဟင်းသီးဟင်းရွက်ဖြစ်သည်။
very	အလွန်	အခန်းသည် အလွန်တိတ်ဆိတ်သည်။
video	ဗီဒီယို	ဤဗီဒီယိုကို ကြည့်ပါ။
village	ရွာ	ရွာသည် သေးသည်။
visit	သွားလည်သည်; လည်ပတ်သည်	ကျွန်တော်တို့သည် အဒေါ်အိမ်သို့ သွားလည်သည်။
visitor	ဧည့်သည်	ဧည့်သည်သည် အပြင်တွင် စောင့်နေသည်။
wait	စောင့်သည်	ကျေးဇူးပြု၍ ဤနေရာတွင် စောင့်ပါ။
waiter	စားပွဲထိုး	စားပွဲထိုးသည် လက်ဖက်ရည် ယူလာသည်။
wake	နိုးသည်; နိုးစေသည်	ကျွန်တော်သည် စောစော နိုးသည်။
walk	လမ်းလျှောက်သည်	ကျွန်တော်တို့သည် ကျောင်းသို့ လမ်းလျှောက်သည်။
wall	နံရံ	နံရံသည် အဖြူရောင်ဖြစ်သည်။
want	လိုချင်သည်; ချင်သည်	ကျွန်တော်သည် ရေလိုချင်သည်။
warm	ပူနွေးသော	အခန်းသည် ပူနွေးသည်။
wash	ဆေးကြောသည်	သင့်လက်ကို ဆေးကြောပါ။
watch	ကြည့်သည်; လက်ပတ်နာရီ	ကျွန်တော်သည် တီဗီကြည့်သည်။
water	ရေ; ရေလောင်းသည်	ရေအနည်းငယ် သောက်ပါ။
way	လမ်း; နည်းလမ်း	ဤလမ်းသည် တိုသည်။
we	ကျွန်တော်တို့; ကျွန်မတို့	ကျွန်တော်တို့သည် အင်္ဂလိပ်စာ သင်ယူသည်။
wear	ဝတ်သည်	ကျွန်တော်သည် ကုတ်အင်္ကျီ ဝတ်ထားသည်။
weather	ရာသီဥတု	ရာသီဥတုသည် အေးသည်။
website	ဝက်ဘ်ဆိုက်	ဤဝက်ဘ်ဆိုက်သည် အသုံးဝင်သည်။
Wednesday	ဗုဒ္ဓဟူးနေ့	အတန်းသည် ဗုဒ္ဓဟူးနေ့တွင် စတင်သည်။
week	အပတ်; သီတင်းပတ်	ဤအပတ်သည် အလုပ်များသည်။
weekend	စနေတနင်္ဂနွေ	စနေတနင်္ဂနွေသည် မနက်ဖြန် စတင်သည်။
welcome	ကြိုဆိုသည်; ကြိုဆိုပါတယ်	ကျွန်တော်တို့အတန်းမှ ကြိုဆိုပါတယ်။
well	ကောင်းစွာ	သူသည် ကောင်းစွာ သီချင်းဆိုသည်။
west	အနောက်	နေသည် အနောက်ဘက်တွင် ဝင်သည်။
what	ဘာ	အဲဒီမှာ ဘာရှိသလဲ။
when	ဘယ်တော့	သင် ဘယ်တော့ စာကျက်သလဲ။
where	ဘယ်မှာ	ဘူတာသည် ဘယ်မှာလဲ။
which	ဘယ်ဟာ; ဘယ်	ဘယ်အိတ်သည် သင့်အိတ်လဲ။
white	အဖြူရောင်	နံရံသည် အဖြူရောင်ဖြစ်သည်။
who	ဘယ်သူ	အဲဒီမှာ ဘယ်သူရှိသလဲ။
why	ဘာကြောင့်	သင် ဘာကြောင့် နောက်ကျသလဲ။
wife	ဇနီး	သူ၏ဇနီးသည် ဆရာမဖြစ်သည်။
will modal	မည်; လိမ့်မည်	ကျွန်တော်သည် သင့်ကို ကူညီမည်။
win	အနိုင်ရသည်	ကျွန်တော်တို့အသင်းသည် အနိုင်ရနိုင်သည်။
window	ပြတင်းပေါက်	ပြတင်းပေါက်ကို ဖွင့်ပါ။
wine	ဝိုင်	ဤဝိုင်သည် အနီရောင်ဖြစ်သည်။
winter	ဆောင်းရာသီ	ဤနေရာတွင် ဆောင်းရာသီသည် အေးသည်။
with	နှင့်; အတူ	ကျွန်တော်နှင့် အတူလာပါ။
without	မပါဘဲ	သကြားမပါဘဲ လက်ဖက်ရည်သည် ကောင်းသည်။
woman	အမျိုးသမီး	အမျိုးသမီးသည် စာအုပ်ဖတ်နေသည်။
wonderful	အံ့သြဖွယ်ကောင်းသော	မြင်ကွင်းသည် အံ့သြဖွယ်ကောင်းသည်။
word	စကားလုံး	စကားလုံးတစ်လုံး ရေးပါ။
work	အလုပ်; အလုပ်လုပ်သည်	ကျွန်တော်သည် အိမ်မှာ အလုပ်လုပ်သည်။
worker	အလုပ်သမား; ဝန်ထမ်း	အလုပ်သမားသည် အလုပ်များနေသည်။
world	ကမ္ဘာ	ကမ္ဘာသည် ကြီးသည်။
would modal	လိမ့်မည်; ချင်သည်	ကျွန်တော်သည် လက်ဖက်ရည်လိုချင်သည်။
write	ရေးသည်	သင့်နာမည်ကို ရေးပါ။
writer	စာရေးဆရာ; စာရေးသူ	စာရေးဆရာသည် ဤနေရာတွင် နေသည်။
writing	စာရေးခြင်း; လက်ရေး	သူမ၏လက်ရေးသည် ရှင်းသည်။
wrong	မှားသော	ဤအဖြေသည် မှားသည်။
yeah	ဟုတ်ကဲ့	ဟုတ်ကဲ့၊ ကျွန်တော် လာနိုင်သည်။
year	နှစ်; ခုနှစ်	ဤနှစ်သည် ကောင်းသည်။
yellow	အဝါရောင်	ငှက်ပျောသီးသည် အဝါရောင်ဖြစ်သည်။
yes	ဟုတ်ကဲ့	ဟုတ်ကဲ့၊ ကျွန်တော် နားလည်သည်။
yesterday	မနေ့က	ကျွန်တော်သည် မနေ့က ဖုန်းဆက်ခဲ့သည်။
you	သင်; မင်း	သင်သည် ကျွန်တော်၏မိတ်ဆွေဖြစ်သည်။
young	ငယ်သော; လူငယ်	ကလေးသည် ငယ်သည်။
your	သင့်၏; မင်း၏	သင့်အိတ်သည် ဤနေရာတွင် ရှိသည်။
yourself	ကိုယ်တိုင်	ကိုယ်တိုင် လက်ဖက်ရည် ယူပါ။`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    if (inlineValue === undefined) index += 1;
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
  const lines = MY_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tMY\texample_MY") {
    throw new Error("Unexpected MY translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad MY translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad MY translation row ${index + 2}: empty field`);
    }
    if (!MYANMAR_RE.test(display) || !MYANMAR_RE.test(example)) {
      throw new Error(`Bad MY translation row ${index + 2}: display/example must contain Myanmar text`);
    }
    if (UNEXPECTED_SCRIPT_RE.test(display) || UNEXPECTED_SCRIPT_RE.test(example)) {
      throw new Error(`Bad MY translation row ${index + 2}: display/example contains unexpected script`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad MY example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate MY translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing MY translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`MY translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part004_support_translation_batch_my_v1",
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
    MY: translation.display,
    example_MY: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows, generatedAt) {
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
  const existing = contract.latest_support_translation_batches ?? [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: KM.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = generatedAt;
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
    `# Oxford Part 004 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: false; Burmese uses normal citation forms without artificial articles",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Script-aware validation: MY Myanmar-script display/example cells and no unexpected script",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows, generatedAt);
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
      next_language: "KM",
    },
    null,
    2
  )
);
