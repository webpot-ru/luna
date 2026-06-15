#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-21.v1";
const RELEASE_ID = "oxford_3000_core_a2_part_001_300_v1";
const SENTENCE_END_RE = /[.!?]$/u;

const EXAMPLE_TSV = `
ability	Her ability to swim is clear.
able	He is able to come today.
abroad	She wants to study abroad.
accept	Please accept this small gift.
accident	The accident happened near school.
according to	According to the report, rain is coming.
achieve	You can achieve your goal.
act	He can act in a play.
active	She is active every day.
actually	Actually, I need more time.
advantage	This plan has an advantage.
adventure	Their trip was an adventure.
advertise	They advertise the new job.
advertisement	I saw an advertisement.
advertising	Advertising helps sell food.
affect	Sleep can affect your health.
against	Do not lean against the wall.
ah	Ah, I understand now.
airline	The airline is very busy.
alive	The small fish is alive.
all right	Everything is all right now.
allow	They allow dogs here.
almost	We are almost ready.
alone	She lives alone.
along	Walk along this road.
already	I already know the answer.
alternative	This train is an alternative.
although	Although it is late, we can stay.
among	He stood among the trees.
amount	The amount is too small.
ancient	This ancient wall is famous.
ankle	My ankle hurts today.
anybody	Can anybody answer this?
any more	I do not need any more.
anyway	Anyway, we can start now.
anywhere	Sit anywhere you like.
app	This app is useful.
appear	Her name will appear here.
appearance	His appearance is different.
apply	Apply for the job today.
architect	The architect has a plan.
architecture	I like modern architecture.
argue	Do not argue with your sister.
argument	The argument was short.
army	The army is large.
arrange	Please arrange the meeting.
arrangement	The arrangement works well.
asleep	The baby is asleep.
assistant	The assistant helped me.
athlete	The athlete runs fast.
attack	The dog may attack.
attend	I attend class today.
attention	Please pay attention now.
attractive	The garden is attractive.
audience	The audience was quiet.
author	The author wrote this book.
available	Food is available now.
average	The average score was good.
avoid	Avoid the busy road.
award	She won an award.
awful	The weather was awful.
background	The picture has a dark background.
badly	He played badly today.
bar	We met at the hotel bar.
baseball	Baseball is popular here.
based	The film is based on a book.
basketball	We play basketball after school.
bean	This bean is green.
bear (animal)	A bear lives in the forest.
beat	Our team can beat them.
beef	I ate beef for dinner.
behave	Please behave in class.
behaviour	His behaviour was polite.
belong	These shoes belong to me.
belt	His belt is black.
benefit	Exercise has a real benefit.
billion	A billion is a huge number.
bin	Put paper in the bin.
biology	Biology is my best class.
birth	Her birth was in May.
biscuit	She eats a biscuit.
bit	I need a bit more time.
blank	Write your name in the blank.
blood	Blood is red.
blow	The wind can blow hard.
board	Write it on the board.
boil	Boil the water first.
bone	The dog has a bone.
borrow	Can I borrow your pen?
boss	My boss is friendly.
bottom	Sign at the bottom.
bowl	The bowl is full.
brain	Your brain needs rest.
bridge	The bridge is old.
bright	The room is bright.
brilliant	That idea is brilliant.
broken	The chair is broken.
brush	Brush your teeth now.
burn	Do not burn the bread.
businessman	The businessman arrived early.
button	Press the red button.
camp	We camp near the lake.
camping	Camping is fun in summer.
can2	Open the can carefully.
care	Take care of your health.
careful	Be careful on the stairs.
carefully	Read the question carefully.
carpet	The carpet is soft.
cartoon	This cartoon is funny.
case	Put it in the case.
cash	I paid in cash.
castle	The castle is very old.
catch	Catch the ball now.
cause	Rain can cause problems.
celebrate	We celebrate my birthday.
celebrity	The celebrity was very kind.
certain	I am certain about this.
certainly	I will certainly help.
chance	You have a chance.
character	This character is brave.
charity	The charity helps children.
chat	We chat after class.
chef	The chef made soup.
chemistry	Chemistry is difficult for me.
chip	This chip is salty.
choice	This choice is important.
church	The church is near here.
cigarette	A cigarette is bad for health.
circle	Draw a circle here.
classical	I enjoy classical music.
clear	The answer is clear.
clearly	Speak clearly, please.
clever	She is a clever child.
climate	The climate is changing.
close2	My school is close to home.
closed	The shop is closed.
clothing	Warm clothing is useful.
cloud	A cloud covers the sun.
coach	The coach helped the team.
coast	We drove along the coast.
code	Enter the code here.
colleague	My colleague called me.
collect	I collect old cards.
column	Read the first column.
comedy	This comedy is funny.
comfortable	This chair is comfortable.
comment	Leave a comment below.
communicate	We communicate by email.
community	Our community is friendly.
compete	They compete every year.
competition	The competition starts tomorrow.
complain	Do not complain again.
completely	I completely agree with you.
condition	The car is in good condition.
conference	The conference starts at nine.
connect	Connect the phone to the computer.
connected	The two ideas are connected.
consider	Please consider my idea.
contain	This box contains books.
context	Context helps you understand.
continent	A continent is very large.
continue	Continue reading, please.
control	Control the speed carefully.
cooker	The cooker is clean.
copy	Make a copy for me.
corner	Sit in the corner.
correctly	Write the answer correctly.
count	Count the books.
couple	The couple arrived early.
cover	Cover the bowl.
crazy	This idea sounds crazy.
creative	She has a creative idea.
credit	I paid by credit card.
crime	Crime is a serious problem.
criminal	The criminal left quickly.
cross	Cross the street carefully.
crowd	A crowd waited outside.
crowded	The train was crowded.
cry	Do not cry now.
cupboard	The cups are in the cupboard.
curly	She has curly hair.
cycle	I cycle to school.
daily	I read the news daily.
danger	The sign shows danger.
data	The data is useful.
dead	The plant is dead.
deal	This is a good deal.
death	Death is a difficult topic.
decision	Make a decision today.
deep	The water is deep.
definitely	I definitely want tea.
degree	My degree is in history.
dentist	The dentist checked my teeth.
department	The shoe department is upstairs.
depend	It depends on the weather.
desert	The desert is very dry.
designer	The designer made this dress.
destroy	Do not destroy the file.
detective	The detective found the key.
develop	They develop a new app.
device	This device is useful.
diary	She writes in her diary.
differently	We do it differently.
digital	This is a digital camera.
direct	Take a direct train.
direction	Walk in this direction.
director	The director liked the film.
disagree	I disagree with that idea.
disappear	The sun will disappear soon.
disaster	The storm was a disaster.
discover	They discover a new island.
discovery	The discovery changed science.
discussion	The discussion ended early.
disease	This disease is serious.
distance	The distance is short.
divorced	Her parents are divorced.
document	Save this document now.
double	I need a double room.
download	Download the app today.
drama	The drama starts tonight.
drawing	Her drawing is beautiful.
dream	I had a strange dream.
driving	Driving at night is hard.
drop	Do not drop the glass.
drug	The drug helped him.
dry	The towel is dry.
earn	I earn money at work.
earth	The earth is round.
easily	She learns easily.
education	Education is important.
effect	The effect was clear.
either	Either answer is fine.
electric	This car is electric.
electrical	The electrical system is safe.
electricity	Electricity is expensive here.
electronic	This electronic ticket works.
employ	They employ five people.
employee	The employee works hard.
employer	My employer is fair.
empty	The room is empty.
ending	The ending was surprising.
energy	I have no energy today.
engine	The engine is loud.
engineer	The engineer fixed the bridge.
enormous	The building is enormous.
enter	Enter the room quietly.
environment	Protect the environment.
equipment	This equipment is expensive.
error	I found an error.
especially	I especially like this song.
essay	Write an essay tonight.
everyday	This is everyday English.
everywhere	Flowers grow everywhere.
evidence	The evidence is clear.
exact	Give the exact number.
exactly	That is exactly right.
excellent	Your work is excellent.
except	Everyone came except me.
exist	Does this address exist?
expect	I expect rain tomorrow.
experience	I have experience with children.
experiment	The experiment worked well.
expert	Ask an expert for help.
explanation	Her explanation was clear.
express	Please express your opinion.
expression	This expression is common.
extreme	The heat was extreme.
extremely	It is extremely cold.
factor	Cost is one factor.
factory	The factory closes at five.
fail	I did not fail.
fair	The price is fair.
fan	Turn on the fan.
farming	Farming is hard work.
fashion	Fashion changes every year.
fear	Fear can stop people.
feature	This phone has a useful feature.
feed	Feed the cat now.
female	The female athlete won.
fiction	She reads fiction at night.
field	The field is green.
fight	They fight too much.
figure	Look at the figure.
finally	We finally arrived home.
finger	My finger hurts.
firstly	Firstly, read the question.
fishing	Fishing is popular here.
fit	These shoes fit well.
fix	Fix the broken chair.
flu	I have the flu.
flying	Flying is fast.
focus	Focus on this task.
following	Read the following sentence.
foreign	She speaks a foreign language.
forest	The forest is quiet.
fork	Use a fork.
formal	This letter is formal.
fortunately	Fortunately, nobody was hurt.
forward	Move forward slowly.
fresh	The bread is fresh.
`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a2_part_001_300_v1_contract_v0.json",
    rowReview: "outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a2_part_001_300_v1_row_review_v1.jsonl",
    outDir: "outputs/oxford-vocabulary/examples",
    mapId: "english_examples_map_v1",
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
    else if (key === "--row-review") args.rowReview = value;
    else if (key === "--out-dir") args.outDir = value;
    else if (key === "--map-id") args.mapId = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function wordCount(sentence) {
  return (normalizeText(sentence).match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/gu) ?? []).length;
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

function parseExamples() {
  const rows = [];
  for (const [index, line] of EXAMPLE_TSV.trim().split(/\r?\n/u).entries()) {
    const [sourceHeadword, example, extra] = line.split("\t");
    if (!sourceHeadword || !example || extra !== undefined) {
      throw new Error(`Invalid example TSV row ${index + 1}: ${line}`);
    }
    rows.push({
      source_headword: normalizeText(sourceHeadword),
      example_EN: normalizeText(example),
    });
  }
  return rows;
}

function validateExamples(rowReviewRows, exampleMapRows) {
  const rowKeys = rowReviewRows.map((row) => row.source_headword);
  const rowKeySet = new Set(rowKeys);
  const exampleKeys = exampleMapRows.map((row) => row.source_headword);
  const exampleKeySet = new Set(exampleKeys);
  const missing = rowKeys.filter((key) => !exampleKeySet.has(key));
  const extra = exampleKeys.filter((key) => !rowKeySet.has(key));
  const duplicates = exampleKeys.filter((key, index) => exampleKeys.indexOf(key) !== index);
  const problems = [];
  if (missing.length) problems.push(`missing examples: ${missing.join(", ")}`);
  if (extra.length) problems.push(`unused examples: ${extra.join(", ")}`);
  if (duplicates.length) problems.push(`duplicate examples: ${[...new Set(duplicates)].join(", ")}`);
  for (const row of exampleMapRows) {
    if (!SENTENCE_END_RE.test(row.example_EN)) problems.push(`${row.source_headword}: missing punctuation`);
    if (wordCount(row.example_EN) > 10) {
      problems.push(`${row.source_headword}: too long (${wordCount(row.example_EN)} words)`);
    }
    if (/\b(word|meaning)\s*:/iu.test(row.example_EN)) {
      problems.push(`${row.source_headword}: template-like example`);
    }
  }
  if (problems.length) {
    throw new Error(`A2 Part001 English example map validation failed:\n${problems.join("\n")}`);
  }
}

function buildMapRows(rowReviewRows, exampleMapRows, generatedAt) {
  const bySourceHeadword = new Map(exampleMapRows.map((row) => [row.source_headword, row.example_EN]));
  return rowReviewRows.map((row) => {
    const example = bySourceHeadword.get(row.source_headword);
    return {
      release_id: row.release_id,
      course_id: row.course_id,
      row_id: row.row_id,
      source_headword: row.source_headword,
      reviewed_display_headword: row.reviewed_display_headword,
      reviewed_part_of_speech: row.reviewed_part_of_speech,
      meaning_id: row.meaning_id,
      example_EN: example,
      example_word_count: wordCount(example),
      example_source: "lunacards_authored_not_oxford",
      example_quality_status: "reviewed",
      example_map_rule_version: "oxford-a2-part001-english-example-map-v1",
      script_path: "scripts/oxford/build-oxford-a2-part001-english-example-map.mjs",
      script_version: SCRIPT_VERSION,
      generated_at: generatedAt,
    };
  });
}

function updateContract(contract, mapPath, summaryPath, rows) {
  contract.latest_english_example_map = {
    map_id: "english_examples_map_v1",
    status: "reviewed_lunacards_authored_source_map_ready",
    script_path: "scripts/oxford/build-oxford-a2-part001-english-example-map.mjs",
    script_version: SCRIPT_VERSION,
    path: mapPath,
    summary_path: summaryPath,
    rows: rows.length,
    max_word_count: Math.max(...rows.map((row) => row.example_word_count)),
    example_source: "lunacards_authored_not_oxford",
    copied_oxford_examples: false,
  };
  contract.next_stage_options = [
    "Build English examples and US/UK edition layer from the reviewed A2 Part001 example map.",
    "Generate source-backed EN-US and EN-GB pronunciation artifacts.",
    "Generate support-language translations/examples in language-order batches.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const rowReviewRows = await readJsonl(args.rowReview);
if (!rowReviewRows.length) {
  throw new Error("Row review is empty");
}
if (rowReviewRows.some((row) => row.release_id !== RELEASE_ID)) {
  throw new Error(`Row review is not for ${RELEASE_ID}`);
}
const exampleMapRows = parseExamples();
validateExamples(rowReviewRows, exampleMapRows);
const generatedAt = new Date().toISOString();
const rows = buildMapRows(rowReviewRows, exampleMapRows, generatedAt);
const outPath = path.join(args.outDir, `${RELEASE_ID}_${args.mapId}.jsonl`);
const summaryPath = path.join(args.outDir, `${RELEASE_ID}_${args.mapId}_summary.md`);
await writeJsonl(outPath, rows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford A2 Part001 English Example Map: ${RELEASE_ID}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Row review source: \`${args.rowReview}\``,
    `- Example map rows: ${rows.length}`,
    "- Example source: `lunacards_authored_not_oxford`",
    "- Example quality status: `reviewed`",
    `- Max word count: ${Math.max(...rows.map((row) => row.example_word_count))}`,
    "- Oxford examples copied: false",
    "- Google Sheet created: false",
    "- Postgres import: false",
    "",
    "This artifact is the reproducible reviewed English example map used by the generic Oxford English-layer builder.",
    "",
  ].join("\n"),
  "utf8"
);

const contract = await readJson(args.contract);
const updatedContract = updateContract(contract, outPath, summaryPath, rows);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: RELEASE_ID,
      rows: rows.length,
      max_word_count: Math.max(...rows.map((row) => row.example_word_count)),
      path: outPath,
      summary_path: summaryPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
