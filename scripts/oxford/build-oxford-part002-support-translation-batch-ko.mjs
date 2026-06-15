#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "KO";
const BATCH_ID = "ko_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-ko.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const HANGUL_RE = /[\uAC00-\uD7AF]/u;

const KO_TRANSLATIONS_TSV = `source_headword	KO	example_KO
clothes	옷	내 옷은 깨끗해요.
club	클럽	그녀는 음악 클럽에 가요.
coat	코트	내 코트는 따뜻해요.
coffee	커피	아침에 커피를 마셔요.
cold	춥다; 차갑다	물이 차가워요.
college	대학	언니는 대학에서 공부해요.
colour	색; 색깔	내가 가장 좋아하는 색은 파란색이에요.
come	오다	여기로 와 주세요.
common	흔하다	이 이름은 흔해요.
company	회사	엄마는 회사에서 일해요.
compare	비교하다	이 두 그림을 비교하세요.
complete	완전하다; 완료하다	양식이 완전해요.
computer	컴퓨터	이 컴퓨터는 새것이에요.
concert	콘서트	우리는 오늘 밤 콘서트에 가요.
conversation	대화	우리는 짧은 대화를 했어요.
cook	요리하다; 요리사	집에서 저녁을 요리해요.
cooking	요리	아빠와 요리하는 것을 좋아해요.
cool	시원하다; 멋지다	방이 시원해요.
correct	맞다; 고치다	네 답은 맞아요.
cost	비용; 비용이 들다	이것은 얼마예요?
could modal	할 수 있다	내가 도와줄 수 있어요.
country	나라	캐나다는 큰 나라예요.
course	강좌; 과정	영어 강좌를 듣고 있어요.
cousin	사촌	내 사촌은 가까이 살아요.
cow	소	소가 풀을 먹어요.
cream	크림	커피에 크림을 넣어요.
create	만들다; 창조하다	그들은 새 게임을 만들어요.
culture	문화	우리는 지역 문화를 배워요.
cup	컵; 잔	이 컵은 비어 있어요.
customer	고객; 손님	손님이 질문해요.
cut	자르다	사과를 반으로 자르세요.
dad	아빠	아빠는 일하고 있어요.
dance	춤추다; 춤	저녁 후에 춤을 춰요.
dancer	무용수; 댄서	그 댄서는 빨리 움직여요.
dancing	춤; 춤추기	춤추는 것은 재미있어요.
dangerous	위험하다	이 길은 위험해요.
dark	어둡다; 진하다	방이 어두워요.
date	날짜	오늘은 며칠이에요?
daughter	딸	그녀의 딸은 여섯 살이에요.
day	날; 하루	좋은 하루 보내세요.
dear	친애하는	친애하는 친구야, 고마워.
December	십이월	내 생일은 십이월이에요.
decide	결정하다	지금 결정하세요.
delicious	맛있다	이 수프는 맛있어요.
describe	묘사하다; 설명하다	네 방을 설명하세요.
description	설명	짧은 설명을 읽으세요.
design	디자인; 설계하다	카드에 간단한 디자인을 만들어요.
desk	책상	책이 내 책상 위에 있어요.
detail	세부 사항	세부 사항 하나가 빠졌어요.
dialogue	대화	지금 이 대화를 읽으세요.
dictionary	사전	수업에서 사전을 써요.
die	죽다	꽃은 물이 없으면 죽어요.
diet	식단; 식생활	내 식단에는 과일이 있어요.
difference	차이	차이가 하나 있어요.
different	다르다	우리는 이름이 달라요.
difficult	어렵다	이 질문은 어려워요.
dinner	저녁 식사	저녁 식사가 준비됐어요.
dirty	더럽다	내 신발은 더러워요.
discuss	의논하다; 토론하다	우리는 계획을 의논해요.
dish	접시; 요리	이 접시는 뜨거워요.
do1	하다	무엇을 하고 있어요?
doctor	의사	의사는 바빠요.
dog	개	개가 밖에서 뛰어요.
dollar	달러	이것은 일 달러예요.
door	문	문을 닫아 주세요.
down	아래로; 아래에	여기에 앉으세요.
downstairs	아래층에; 아래층으로	부엌은 아래층에 있어요.
draw	그리다	작은 집을 그리세요.
dress	드레스; 옷을 입다	그녀는 빨간 드레스를 입어요.
drink	음료; 마시다	물을 마셔요.
drive	운전하다	일하러 운전해서 가요.
driver	운전사	운전사가 여기에서 멈춰요.
during	동안	비행 동안 잠을 자요.
DVD	디브이디	이 디브이디는 오래됐어요.
each	각각의; 각	각 아이가 책을 가지고 있어요.
ear	귀	귀가 아파요.
early	이르다	일찍 일어나요.
east	동쪽	해는 동쪽에서 떠요.
easy	쉽다	이 시험은 쉬워요.
eat	먹다	우리는 함께 점심을 먹어요.
egg	달걀	달걀 하나를 먹어요.
eight	여덟	카드가 여덟 장 있어요.
eighteen	열여덟	그녀는 열여덟 살이에요.
eighty	여든	할아버지는 여든 살이에요.
elephant	코끼리	코끼리는 커요.
eleven	열하나	수업은 열한 시에 시작해요.
else	다른; 그 밖에	그 밖에 무엇이 필요해요?
email	이메일	나에게 이메일을 보내 주세요.
end	끝; 끝나다	이것이 끝이에요.
enjoy	즐기다	이 노래를 즐겨요.
enough	충분하다	시간이 충분해요.
euro	유로	이것은 일 유로예요.
even	심지어	심지어 내 동생도 알아요.
evening	저녁	오늘 저녁에 만나요.
event	행사; 사건	행사는 오늘 시작해요.
ever	지금까지; 언젠가	지금까지 요리해 본 적 있어요?
every	모든; 매	매일 공부해요.
everybody	모두	모두 여기 있어요.
everyone	모두; 모든 사람	모두 음악을 좋아해요.
everything	모든 것	모든 것이 준비됐어요.
exam	시험	시험이 곧 시작돼요.
example	예; 예시	이것은 좋은 예예요.
excited	신이 난	오늘은 신이 나요.
exciting	신나는	그 경기는 신나요.
exercise	운동; 연습	아침 식사 전에 운동해요.
expensive	비싸다	이 코트는 비싸요.
explain	설명하다	이 단어를 설명해 주세요.
extra	추가의; 여분의	추가 시간이 필요해요.
eye	눈	눈이 빨개요.
face	얼굴	얼굴을 씻으세요.
fact	사실	이 사실은 중요해요.
fall	떨어지다; 가을	가을에는 잎이 떨어져요.
false	틀린; 거짓의	이 답은 틀렸어요.
family	가족	우리 가족은 작아요.
famous	유명하다	그녀는 유명한 가수예요.
fantastic	환상적이다; 아주 멋지다	콘서트는 아주 멋졌어요.
far	멀다	학교는 멀어요.
farm	농장	그들은 농장에 살아요.
farmer	농부	농부는 음식을 길러요.
fast	빠르다	이 기차는 빨라요.
fat	뚱뚱하다	그 고양이는 뚱뚱해요.
father	아버지; 아빠	아버지는 키가 커요.
favourite	가장 좋아하는	이것은 내가 가장 좋아하는 노래예요.
February	이월	여기는 이월에 추워요.
feel	느끼다	행복하다고 느껴요.
feeling	감정; 느낌	그 느낌을 알아요.
festival	축제	축제는 내일 시작해요.
few	적은; 몇몇	여기에 학생이 몇 명 있어요.
fifteen	열다섯	나는 열다섯 살이에요.
fifth	다섯 번째	이것은 다섯 번째 수업이에요.
fifty	쉰	엄마는 쉰 살이에요.
fill	채우다; 작성하다	컵에 물을 채우세요.
film	영화	영화를 봐요.
final	마지막의; 최종의	이것은 마지막 질문이에요.
find	찾다	열쇠를 찾았어요.
fine	괜찮다; 좋은	지금은 괜찮아요.
finish	끝내다; 마치다	숙제를 끝내세요.
fire	불; 화재	불은 뜨거워요.
first	첫 번째의; 먼저	그녀는 줄에서 첫 번째예요.
fish	물고기; 생선	저녁에 생선을 먹어요.
five	다섯	책이 다섯 권 있어요.
flat	아파트	내 아파트는 작아요.
flight	항공편; 비행	항공편이 늦어요.
floor	바닥; 층	가방은 바닥에 있어요.
flower	꽃	이 꽃은 노란색이에요.
fly	날다; 비행기로 가다	새가 하늘을 날아요.
follow	따라가다; 따르다	나를 따라오세요.
food	음식	음식이 준비됐어요.
foot	발	발이 아파요.
football	축구	오늘 축구를 해요.
for	위해; 에게	이 선물은 당신을 위한 거예요.
forget	잊다	열쇠를 잊지 마세요.
form	양식; 형태	양식을 작성하세요.
forty	마흔	아버지는 마흔 살이에요.
four	넷	새 네 마리가 보여요.
fourteen	열넷	그녀는 열네 살이에요.
fourth	네 번째	여기는 네 번째 층이에요.
free	무료의; 자유로운	표는 무료예요.
Friday	금요일	금요일에 만나요.
friend	친구	내 친구가 여기 있어요.
friendly	친절하다	선생님은 친절해요.
from	에서; 부터	나는 여기 출신이에요.
front	앞; 앞쪽	그것은 앞에 있어요.
fruit	과일	매일 과일을 먹어요.
full	가득 찬; 배부른	병이 가득 차 있어요.
fun	재미; 재미있는	이 게임은 재미있어요.
funny	웃긴; 재미있는	그 영화는 웃겨요.
future	미래	네 미래를 생각해 보세요.
game	게임; 경기	게임이 지금 시작돼요.
garden	정원	정원은 예뻐요.
geography	지리	학교에서 지리를 공부해요.
get	얻다; 도착하다	여섯 시에 집에 도착해요.
girl	여자아이; 소녀	여자아이가 웃어요.
girlfriend	여자친구	그의 여자친구는 친절해요.
give	주다	책을 나에게 주세요.
glass	유리잔; 유리	유리잔으로 물을 마셔요.
go	가다	지금 집에 가요.
good	좋은	이 커피는 좋아요.
goodbye	안녕; 안녕히 가세요	안녕, 내일 봐요.
grandfather	할아버지	할아버지는 나이가 많아요.
grandmother	할머니	할머니는 수프를 만들어요.
grandparent	조부모	조부모 한 분이 우리와 함께 살아요.
great	훌륭한; 큰	그것은 훌륭한 생각이에요.
green	초록색의	문은 초록색이에요.
grey	회색의	하늘은 회색이에요.
group	그룹; 무리	작은 그룹에서 일하세요.
grow	자라다; 기르다	식물은 정원에서 자라요.
guess	추측하다; 맞히다	답을 맞혀 보세요.
guitar	기타	그는 기타를 쳐요.
gym	헬스장; 체육관	헬스장에 가요.
hair	머리카락	그녀는 긴 머리카락을 가지고 있어요.
half	반; 절반	케이크를 반으로 자르세요.
hand	손	손을 들어 주세요.
happen	일어나다	다음에 무슨 일이 일어나요?
happy	행복하다; 기쁘다	오늘은 기뻐요.
hard	딱딱하다; 어렵다	이 의자는 딱딱해요.
hat	모자	내 모자는 검은색이에요.
hate	싫어하다	차가운 차를 싫어해요.
have	가지다; 있다	차를 가지고 있어요.
have to modal	해야 한다	공부해야 해요.
he	그	그는 내 형이에요.
head	머리	머리가 아파요.
health	건강	좋은 음식은 건강에 도움이 돼요.
healthy	건강한	이 요리는 건강해요.
hear	듣다	음악이 들려요.
hello	안녕하세요	안녕하세요, 만나서 반가워요.
help	돕다; 도움	도와주세요.
her	그녀의; 그녀를	이것은 그녀의 가방이에요.
here	여기	지금 여기로 오세요.
hey	야; 저기요	저기요, 기다려 주세요.
hi	안녕	안녕, 잘 지내요?
high	높다	벽이 높아요.
him	그를; 그에게	나는 그를 알아요.
his	그의	그의 코트는 파란색이에요.
history	역사	역사를 공부해요.
hobby	취미	독서는 내 취미예요.
holiday	휴가; 휴일	칠월에 휴가를 가요.
home	집; 집에	집에 있어요.
homework	숙제	오늘 밤 숙제를 하세요.
hope	바라다; 희망하다	네가 오기를 바라요.
horse	말	말은 빨리 달려요.
hospital	병원	병원은 가까워요.
hot	뜨겁다; 덥다	수프가 뜨거워요.
hotel	호텔	호텔은 깨끗해요.
hour	시간	한 시간을 기다리세요.
house	집	이 집은 오래됐어요.
how	어떻게	잘 지내요?
however	그러나	그러나 여기 있을 수 있어요.
hundred	백	백 명이 왔어요.
hungry	배고프다	배가 고파요.
husband	남편	그녀의 남편은 의사예요.
I	나; 저	나는 차를 좋아해요.
ice	얼음	얼음은 차가워요.
ice cream	아이스크림	아이스크림을 원해요.
idea	생각; 아이디어	그것은 좋은 생각이에요.
if	만약	도움이 필요하면 전화하세요.
imagine	상상하다	작은 집을 상상해 보세요.
important	중요하다	이 수업은 중요해요.
improve	향상시키다; 나아지다	더 나아지고 싶어요.
in	안에; 에	열쇠는 내 가방 안에 있어요.
include	포함하다	이름을 포함해 주세요.
information	정보	정보가 더 필요해요.
interest	관심; 흥미	그녀는 예술에 관심이 있어요.
interested	관심 있는	음악에 관심이 있어요.
interesting	흥미로운; 재미있는	이 책은 재미있어요.
internet	인터넷	인터넷이 느려요.
interview	면접; 인터뷰	오늘 면접이 있어요.
into	안으로	책을 가방 안으로 넣으세요.
introduce	소개하다	친구를 소개해 주세요.
island	섬	이 섬은 작아요.
it	그것	날씨가 추워요.
its	그것의	개는 자기 침대를 좋아해요.
jacket	재킷	내 재킷은 새것이에요.
January	일월	일월은 한 해의 첫 달이에요.
jeans	청바지	내 청바지는 파란색이에요.
job	일; 직업	새 일이 필요해요.
join	참여하다; 가입하다	오늘 우리 수업에 참여하세요.
journey	여행; 여정	여행은 길어요.
juice	주스	오렌지 주스를 마셔요.
July	칠월	우리는 칠월에 여행해요.
June	유월	학교는 유월에 끝나요.
just	단지; 방금	물만 필요해요.
keep	지키다; 보관하다	이 열쇠를 보관하세요.
key	열쇠	열쇠를 잃어버렸어요.
kilometre	킬로미터	일 킬로미터를 걸어요.
kind (type)	종류	어떤 종류의 음악을 좋아해요?
kitchen	부엌; 주방	부엌은 깨끗해요.
know	알다	답을 알아요.
land	땅; 육지	비행기는 땅에 있어요.
language	언어	영어는 하나의 언어예요.
large	큰	이 방은 커요.
last1 (final)	마지막의	이것은 마지막 페이지예요.
late	늦다	버스가 늦어요.
later	나중에	나중에 봐요.
laugh	웃다	우리는 함께 웃어요.
learn	배우다	영어를 배워요.
leave	떠나다; 남기다	지금 집을 떠나요.
left	왼쪽; 왼쪽의	여기에서 왼쪽으로 도세요.
leg	다리	다리가 아파요.
lesson	수업; 레슨	수업이 지금 시작돼요.
let	하게 하다; 허락하다	내가 도와주게 해 주세요.
letter	편지; 글자	편지를 써요.
library	도서관	도서관은 아홉 시에 열어요.
lie1	눕다	침대에 누워 주세요.
life	삶; 생활	도시 생활은 활기차요.
like (similar)	비슷하다; 같다	이것은 게임 같아요.
like (find sb/sth pleasant)	좋아하다	이 노래를 좋아해요.
line	줄; 선	줄에 서 주세요.
lion	사자	사자는 자고 있어요.
list	목록; 리스트	쇼핑 목록을 만드세요.
listen	듣다	선생님의 말을 들으세요.
little	작은; 조금의	돈이 조금 있어요.
live1	살다	학교 근처에 살아요.
local	지역의; 현지의	이것은 지역 가게예요.
long1	길다	길이 길어요.
look	보다; 보이다	그림을 보세요.
lose	잃다	표를 잃지 마세요.
lot	많음; 많이	숙제가 많이 있어요.
love	사랑; 사랑하다	가족을 사랑해요.
lunch	점심	점심이 준비됐어요.`;

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
  const lines = KO_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tKO\texample_KO") {
    throw new Error("Unexpected KO translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad KO translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad KO translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad KO example punctuation for ${sourceHeadword}`);
    }
    if (!HANGUL_RE.test(display)) {
      throw new Error(`Bad KO display script for ${sourceHeadword}`);
    }
    if (!HANGUL_RE.test(example)) {
      throw new Error(`Bad KO example script for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate KO translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing KO translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`KO translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part002_support_translation_batch_ko_v1",
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
    KO: translation.display,
    example_KO: translation.example,
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
    "- Script-aware validation: KO Hangul script for display and example cells",
    "- Korean style policy: entries use dictionary/citation-style display where useful; examples use short learner-friendly polite style",
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
