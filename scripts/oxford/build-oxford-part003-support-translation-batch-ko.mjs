#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "KO";
const BATCH_ID = "ko_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-ko.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;
const HANGUL_RE = /[\uAC00-\uD7AF]/u;

const KO_TRANSLATIONS_TSV = `source_headword	KO	example_KO
machine	기계; 머신	이 기계는 커피를 만들어요.
magazine	잡지	그녀는 음악 잡지를 읽어요.
main	주요한; 주된	이것은 정문이에요.
make	만들다; 하다	집에서 점심을 만들어요.
man	남자	그 남자는 내 선생님이에요.
many	많은	많은 학생이 여기 있어요.
map	지도	지도를 보세요.
March	삼월	내 생일은 삼월이에요.
market	시장	우리는 시장에서 과일을 사요.
married	결혼한	내 언니는 결혼했어요.
May	오월	학교는 오월에 끝나요.
maybe	아마; 어쩌면	아마 비가 올 거예요.
me	나를; 나에게	저를 도와주세요.
meal	식사	이 식사는 따뜻해요.
mean	의미하다	이 표지는 무슨 뜻이에요?
meaning	뜻; 의미	뜻이 뭐예요?
meat	고기	저녁에 고기를 먹어요.
meet	만나다	수업 후에 만나요.
meeting	회의; 모임	회의가 지금 시작해요.
member	회원; 구성원	그녀는 클럽 회원이에요.
menu	메뉴	메뉴를 읽어 주세요.
message	메시지	짧은 메시지를 보내요.
metre	미터	일 미터 앞으로 걸으세요.
midnight	자정	기차는 자정에 떠나요.
mile	마일	우리는 일 마일을 걸어요.
milk	우유	아침에 우유를 마셔요.
million	백만	백만 명이 여기 살아요.
minute1	분	일 분만 기다려 주세요.
miss	그리워하다; 놓치다	옛 학교가 그리워요.
mistake	실수; 오류	이 답에는 실수가 있어요.
model	모형; 모델	이것은 작은 모형이에요.
modern	현대적인	부엌은 현대적이에요.
moment	순간; 잠깐	잠깐 기다려 주세요.
Monday	월요일	우리는 월요일에 일을 시작해요.
money	돈	돈이 조금 필요해요.
month	달; 월	유월은 더운 달이에요.
more	더; 더 많은	시간이 더 필요해요.
morning	아침	아침에 공부해요.
most	대부분; 가장	대부분의 학생은 음악을 좋아해요.
mother	어머니; 엄마	우리 엄마는 오늘 일해요.
mountain	산	그 산은 높아요.
mouse	쥐; 마우스	쥐가 의자 아래에 있어요.
mouth	입	입을 열어 주세요.
move	움직이다; 옮기다	의자를 여기로 옮기세요.
movie	영화	오늘 밤 영화를 봐요.
much	많이; 얼마	이것은 얼마예요?
mum	엄마	엄마는 집에 있어요.
museum	박물관	박물관은 열 시에 열어요.
music	음악	음악을 들어요.
must modal	해야 하다	여기서 멈춰야 해요.
my	나의; 내	이것은 내 책이에요.
name	이름; 이름을 붙이다	여기에 이름을 쓰세요.
natural	자연의; 자연스러운	이 주스는 자연스러워요.
near	가까운; 근처에	은행은 여기 근처에 있어요.
need	필요하다	펜이 필요해요.
negative	부정적인	이 답은 부정적이에요.
neighbour	이웃	내 이웃은 친절해요.
never	절대 안; 결코	커피를 절대 마시지 않아요.
new	새로운; 새	이 전화기는 새것이에요.
news	뉴스	오늘 뉴스는 좋아요.
newspaper	신문	그는 신문을 읽어요.
next	다음의	다음 버스가 늦어요.
next to	옆에	내 옆에 앉으세요.
nice	좋은; 친절한	방이 좋아요.
night	밤	밤에 잠을 자요.
nine	아홉	학생 아홉 명이 여기 있어요.
nineteen	열아홉	그녀는 열아홉 살이에요.
ninety	아흔	할아버지는 아흔 살이에요.
no	아니요; 없는	아니요, 괜찮아요.
no one	아무도 없음	방에 아무도 없어요.
nobody	아무도 없음	집에 아무도 없어요.
north	북쪽	역은 여기 북쪽에 있어요.
nose	코	내 코가 차가워요.
not	아니다; 않다	나는 피곤하지 않아요.
note	메모; 노트	지금 메모를 쓰세요.
nothing	아무것도 없음	상자 안에는 아무것도 없어요.
November	십일월	내 수업은 십일월에 시작해요.
now	지금	지금 여기로 오세요.
number	숫자; 번호	여기에 번호를 쓰세요.
nurse	간호사	간호사는 친절해요.
object	물건; 대상	그 물건을 책상 위에 놓으세요.
o’clock	시	수업은 아홉 시에 시작해요.
October	시월	우리는 시월에 여행해요.
of	의	이것은 차 한 잔이에요.
off	꺼진; 떨어져	불을 꺼 주세요.
office	사무실	내 사무실은 작아요.
often	자주	학교에 자주 걸어가요.
oh	오; 아	오, 이제 이해해요.
OK	괜찮다; 오케이	이것은 괜찮아요?
old	오래된; 나이 든	이 집은 오래됐어요.
on	위에; 켜져	책은 책상 위에 있어요.
once	한 번	일주일에 한 번 전화해요.
one	하나; 한	나는 언니가 한 명 있어요.
onion	양파	양파 하나를 자르세요.
online	온라인	온라인으로 공부해요.
only	오직; 단지	가방이 하나만 있어요.
open	열다; 열린	창문을 열어 주세요.
opinion	의견	당신의 의견은 뭐예요?
opposite	맞은편의; 반대의	가게는 은행 맞은편에 있어요.
or	또는	차예요, 아니면 커피예요?
orange	오렌지; 주황색	이 오렌지는 달아요.
order	주문하다; 주문	수프를 주문해요.
other	다른	다른 문을 사용하세요.
our	우리의	이것은 우리 교실이에요.
out	밖으로; 밖에	점심 후에 밖으로 나가세요.
outside	밖에; 바깥에	아이들이 밖에서 놀아요.
over	위에; 넘어서	비행기가 도시 위를 날아요.
own	자신의	내 방이 따로 있어요.
page	쪽; 페이지	십 쪽을 펴세요.
paint	칠하다; 그리다	벽을 파란색으로 칠하세요.
painting	그림; 회화	이 그림은 아름다워요.
pair	한 쌍	양말 한 켤레가 필요해요.
paper	종이	이 종이에 쓰세요.
paragraph	문단	첫 문단을 읽으세요.
parent	부모	부모 한 명이 밖에서 기다려요.
park	주차하다; 공원	역 근처에 주차해요.
part	부분	이 부분은 쉬워요.
partner	파트너; 짝	파트너와 함께 일하세요.
party	파티	파티는 일곱 시에 시작해요.
passport	여권	여권을 보여 주세요.
past	지난; 과거의	여섯 시 반이에요.
pay	내다; 지불하다	카드로 돈을 내요.
pen	펜	이 펜은 파란색이에요.
pencil	연필	연필로 써요.
people	사람들	많은 사람이 여기 있어요.
pepper	후추	수프에 후추를 넣으세요.
perfect	완벽한	당신의 답은 완벽해요.
period	기간; 수업 시간	수업 시간이 짧아요.
person	사람	한 사람이 기다리고 있어요.
personal	개인의	이것은 내 개인 전화예요.
phone	전화; 휴대전화	내 휴대전화는 가방 안에 있어요.
photo	사진	여기서 사진을 찍으세요.
photograph	사진; 사진을 찍다	이 사진은 오래됐어요.
phrase	구; 표현	그 표현을 반복해 주세요.
piano	피아노	그녀는 피아노를 쳐요.
picture	그림; 사진	이 그림을 보세요.
piece	조각	케이크 한 조각을 가져가세요.
pig	돼지	돼지는 농장에 있어요.
pink	분홍색	그녀의 가방은 분홍색이에요.
place	장소; 놓다	이 장소는 조용해요.
plan	계획	우리는 계획이 필요해요.
plane	비행기	비행기가 늦어요.
plant	식물; 심다	오늘 식물에 물을 주세요.
play	놀다; 연주하다	아이들이 공원에서 놀아요.
player	선수; 플레이어	그 선수는 빨리 달려요.
please	제발; 부탁해요	여기에 앉아 주세요.
point	점; 요점	이 점은 중요해요.
police	경찰	경찰이 밖에 있어요.
policeman	남자 경찰관	그 경찰관이 우리를 도와요.
pool	수영장	수영장은 차가워요.
poor	가난한; 불쌍한	그 불쌍한 아이는 배고파요.
popular	인기 있는	이 노래는 인기가 있어요.
positive	긍정적인	이것은 긍정적인 결과예요.
possible	가능한	오늘 가능해요?
post	게시물; 올리다	그녀의 게시물을 온라인에서 읽어요.
potato	감자	감자 하나를 먹어요.
pound	파운드	그것은 일 파운드예요.
practice	연습	연습은 매일 도움이 돼요.
practise	연습하다	매일 영어를 연습해요.
prefer	더 좋아하다	나는 차를 더 좋아해요.
prepare	준비하다	오늘 밤 가방을 준비하세요.
present	현재의; 참석한	그녀는 오늘 참석했어요.
pretty	예쁜; 꽤	정원이 예뻐요.
price	가격	가격이 낮아요.
probably	아마	그녀는 아마 알아요.
problem	문제	이 문제는 작아요.
product	제품	이 제품은 새것이에요.
programme	프로그램	프로그램이 지금 시작해요.
project	프로젝트; 계획	우리 프로젝트는 준비됐어요.
purple	보라색	셔츠는 보라색이에요.
put	놓다; 두다	책을 여기에 놓으세요.
quarter	사분의 일; 십오 분	두 시 십오 분이에요.
question	질문	질문 하나를 하세요.
quick	빠른	이것은 빠른 시험이에요.
quickly	빨리	빨리 걸어 주세요.
quiet	조용한	도서관은 조용해요.
quite	꽤	이 방은 꽤 작아요.
radio	라디오	라디오 소리가 커요.
rain	비; 비가 오다	비가 지금 내리기 시작해요.
read	읽다	이 문장을 읽으세요.
reader	독자	그 독자는 이야기를 좋아해요.
reading	읽기; 독서	독서는 내가 배우는 데 도움이 돼요.
ready	준비된	저녁 식사가 준비됐어요.
real	진짜의; 실제의	이것은 진짜 문제예요.
really	정말	이 노래를 정말 좋아해요.
reason	이유	이유를 말해 주세요.
red	빨간색; 빨간	문은 빨간색이에요.
relax	쉬다; 긴장을 풀다	일 후에 쉬세요.
remember	기억하다	여권을 기억하세요.
repeat	반복하다	문장을 반복해 주세요.
report	보고서; 보고하다	오늘 밤 보고서를 읽으세요.
restaurant	식당	식당은 바빠요.
result	결과	결과가 좋아요.
return	돌아오다; 돌려주다	내일 책을 돌려주세요.
rice	밥; 쌀	점심에 밥을 먹어요.
rich	부유한	그 도시는 부유해요.
ride	타다	자전거를 타요.
right	오른쪽; 맞는	여기서 오른쪽으로 도세요.
river	강	그 강은 넓어요.
road	길; 도로	이 길은 길어요.
room	방	내 방은 깨끗해요.
routine	일과; 루틴	내 일과는 일찍 시작해요.
rule	규칙	이 규칙은 간단해요.
run	달리다	매일 아침 달려요.
sad	슬픈	그는 오늘 슬퍼요.
salad	샐러드	이 샐러드는 신선해요.
salt	소금	소금을 조금 넣으세요.
same	같은	우리는 같은 가방을 가지고 있어요.
sandwich	샌드위치	샌드위치를 먹어요.
Saturday	토요일	우리는 토요일에 만나요.
say	말하다	이름을 말해 주세요.
school	학교	내 학교는 가까이 있어요.
science	과학	과학을 공부해요.
scientist	과학자	과학자가 질문해요.
sea	바다	바다는 파래요.
second1 (unit of time)	초	일 초만 기다려 주세요.
section	부분; 구역	이 부분을 읽으세요.
see	보다; 만나다	친구를 봐요.
sell	팔다	그들은 신선한 과일을 팔아요.
send	보내다	지금 메시지를 보내세요.
sentence	문장	문장 하나를 쓰세요.
September	구월	학교는 구월에 시작해요.
seven	일곱	일곱 명이 여기 있어요.
seventeen	열일곱	그는 열일곱 살이에요.
seventy	일흔	할머니는 일흔 살이에요.
share	나누다; 공유하다	케이크를 나누세요.
she	그녀	그녀는 내 언니예요.
sheep	양	양은 풀을 먹어요.
shirt	셔츠	그의 셔츠는 깨끗해요.
shoe	신발	신발 한 짝이 침대 아래에 있어요.
shop	가게; 쇼핑하다	가게가 일찍 닫아요.
shopping	쇼핑	오늘 쇼핑은 재미있어요.
short	짧은	이 이야기는 짧아요.
should modal	해야 하다	오늘 쉬어야 해요.
show	보여 주다; 쇼	표를 보여 주세요.
shower	샤워	샤워를 해요.
sick	아픈	오늘 몸이 아파요.
similar	비슷한	우리 가방은 비슷해요.
sing	노래하다	수업에서 노래해요.
singer	가수	그 가수는 유명해요.
sister	자매; 언니; 여동생	내 여동생은 어려요.
sit	앉다	창문 근처에 앉으세요.
situation	상황	이 상황은 새로워요.
six	여섯	책 여섯 권이 여기 있어요.
sixteen	열여섯	그녀는 열여섯 살이에요.
sixty	예순	아버지는 예순 살이에요.
skill	기술; 능력	이 기술은 유용해요.
skirt	치마	그녀의 치마는 파란색이에요.
sleep	자다; 잠	여덟 시간 자요.
slow	느린	버스가 느려요.
small	작은	방이 작아요.
snake	뱀	그 뱀은 길어요.
snow	눈; 눈이 오다	겨울에 눈이 와요.
so	그래서; 그렇게	피곤해서 쉬어요.
some	몇몇의; 약간의	물이 좀 필요해요.
somebody	누군가	누군가 문 앞에 있어요.
someone	누군가	누군가 메시지를 남겼어요.
something	무언가	마실 것이 필요해요.
sometimes	때때로	때때로 걸어서 학교에 가요.
son	아들	그녀의 아들은 학교에 있어요.
song	노래	이 노래는 새로워요.
soon	곧	곧 만나요.
sorry	미안한	미안해요.
sound	소리	소리가 커요.
soup	수프	수프가 뜨거워요.
south	남쪽	호텔은 여기 남쪽에 있어요.
space	공간; 자리	의자 하나 놓을 공간이 있어요.
speak	말하다	천천히 말해 주세요.
special	특별한	오늘은 특별한 날이에요.
spell	철자를 말하다	이름의 철자를 말해 주세요.
spelling	철자	철자를 확인하세요.
spend	쓰다; 보내다	음식에 돈을 써요.
sport	스포츠	축구는 인기 있는 스포츠예요.
spring	봄; 뛰다	봄에 꽃이 자라요.
stand	서다	문 근처에 서세요.
star	별	밝은 별이 보여요.
start	시작하다	지금 수업을 시작하세요.
statement	진술; 말	이 말은 사실이에요.
station	역	역은 가까워요.
stay	머무르다; 있다	오늘 집에 있으세요.
still	아직도	아직 배고파요.
stop	멈추다; 정류장	모퉁이에서 멈추세요.
story	이야기	이야기를 해 주세요.
street	거리	이 거리는 조용해요.
strong	강한	그는 강해요.
student	학생	학생이 책을 읽어요.
study	공부하다; 연구	영어를 공부해요.
style	스타일	이 스타일이 좋아요.
subject	과목; 주제	영어는 내 주요 과목이에요.
success	성공	성공에는 연습이 필요해요.
sugar	설탕	차에 설탕을 넣으세요.
summer	여름	여기는 여름이 더워요.
sun	해; 태양	해가 밝아요.
Sunday	일요일	우리는 일요일에 쉬어요.
supermarket	슈퍼마켓	슈퍼마켓이 열려 있어요.
sure	확실한	나는 확실해요.
sweater	스웨터	내 스웨터는 따뜻해요.
swim	수영하다	매주 수영해요.
swimming	수영	수영은 좋은 운동이에요.
table	탁자; 테이블	열쇠는 탁자 위에 있어요.`;

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
    if (!HANGUL_RE.test(display) || !HANGUL_RE.test(example)) {
      throw new Error(`Korean row must contain Hangul for ${sourceHeadword}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Korean example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Korean translation row for ${sourceHeadword}`);
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
    "Generate VI support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after VI.",
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
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-ko.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ko_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_ko_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(KO_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Korean translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Korean translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: not applicable for Korean
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
