#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-21.v1";
const RELEASE_ID = "oxford_3000_core_a2_part_002_300_v1";
const SENTENCE_END_RE = /[.!?]$/u;

const EXAMPLE_TSV = `
fridge	The milk is in the fridge.
frog	A frog jumped into the pond.
furniture	This furniture is old but strong.
further	We need further information.
gallery	The gallery is open today.
gap	There is a gap in the wall.
gas	The car needs gas.
gate	Close the gate, please.
general	This is a general rule.
gift	She bought a gift.
goal	Our goal is simple.
god	Many people pray to God.
gold	The ring is gold.
golf	He plays golf today.
government	The government changed the law.
grass	The grass is wet.
greet	Greet each guest politely.
ground	Sit on the ground.
guest	Our guest arrived early.
guide	The guide showed us the museum.
gun	The police found a gun.
guy	That guy is my brother.
habit	Reading daily is a good habit.
hall	Wait in the hall.
happily	They lived happily together.
headache	I have a headache.
heart	Her heart beats fast.
heat	Heat the soup slowly.
heavy	This bag is heavy.
height	Measure the height of the table.
helpful	Your advice was helpful.
hero	He is my hero.
hers	The blue coat is hers.
herself	She made dinner herself.
hide	Hide the key under the box.
hill	We climbed the hill.
himself	He fixed it himself.
hit	Do not hit the door.
hockey	We watched hockey last night.
hold	Hold my hand.
hole	There is a hole in my sock.
huge	The room is huge.
human	Every human needs water.
hurt	My knee hurts.
ideal	This room is ideal for studying.
identify	Can you identify this bird?
ill	She feels ill today.
illness	The illness lasted a week.
image	The image is clear.
immediately	Come here immediately.
impossible	This puzzle seems impossible.
included	Breakfast is included.
including	Ten people came, including me.
increase	Prices increase in summer.
incredible	The view was incredible.
independent	My sister is independent.
individual	Each individual has a number.
industry	The local industry is growing.
informal	This email is informal.
injury	His injury is not serious.
insect	An insect landed on the cup.
inside	Wait inside the house.
instead	Drink water instead.
instruction	Read each instruction carefully.
instructor	The instructor explained the exercise.
instrument	She plays an instrument.
intelligent	He is an intelligent student.
international	This is an international airport.
introduction	The introduction was short.
invent	Children can invent new games.
invention	The invention saved time.
invitation	I received an invitation.
invite	Invite your friend too.
involve	The job will involve travel.
item	Choose one item.
itself	The machine turns itself off.
jam	Put jam on the bread.
jazz	Jazz sounds great tonight.
jewellery	She keeps jewellery in a box.
joke	Tell me a joke.
journalist	The journalist asked questions.
jump	Jump over the line.
kid	The kid is laughing.
kill	Do not kill the insect.
king	The king lived in a palace.
knee	My knee hurts.
knife	Use a sharp knife.
knock	Knock before you enter.
knowledge	Knowledge grows with practice.
lab	The lab is closed.
lady	The lady smiled at us.
lake	The lake is calm.
lamp	Turn on the lamp.
laptop	My laptop is new.
last1 (taking time)	The film lasts two hours.
laughter	We heard laughter outside.
law	The law changed yesterday.
lawyer	The lawyer called me.
lazy	Do not be lazy.
lead1	Good leaders lead by example.
leader	She is the team leader.
learning	Learning takes time.
least	Choose the least expensive one.
lecture	The lecture starts at ten.
lemon	Add lemon to the tea.
lend	Can you lend me five dollars?
less	Eat less sugar.
level	This level is easy.
lifestyle	He has a healthy lifestyle.
lift	Lift the box carefully.
light	Light the candle carefully.
light (not heavy)	This bag is light.
likely	Rain is likely tomorrow.
link	Send me the link.
listener	Be a good listener.
lock	Lock the door.
lorry	The lorry carried boxes.
lost	We are lost.
loud	The music is loud.
loudly	Please do not speak loudly.
lovely	What a lovely garden!
low	The chair is low.
luck	Good luck with your test.
lucky	You are lucky today.
mail	I got mail this morning.
major	This is a major problem.
male	The male bird is bright.
manage	Can you manage this task?
manager	The manager is busy.
manner	Speak in a polite manner.
mark	Mark your answer clearly.
marry	They will marry in June.
material	This material feels soft.
mathematics	Mathematics is my favorite subject.
maths	Maths is hard for me.
matter	It does not matter.
may modal	You may leave now.
media	The media covered the story.
medical	She needs medical help.
medicine	Take this medicine after lunch.
memory	My memory is good.
mention	Do not mention my name.
metal	The gate is metal.
method	This method works well.
middle	Stand in the middle.
might modal	It might rain later.
mind	I changed my mind.
mine (belongs to me)	This book is mine.
mirror	Look in the mirror.
missing	My keys are missing.
mobile	My mobile is on the table.
monkey	The monkey climbed the tree.
moon	The moon is bright.
mostly	The class is mostly quiet.
motorcycle	He rides a motorcycle.
movement	I saw movement in the trees.
musical	This is a musical film.
musician	The musician played guitar.
myself	I made this myself.
narrow	The road is narrow.
national	It is a national holiday.
nature	I love nature.
nearly	We are nearly there.
necessary	Is this necessary?
neck	My neck hurts.
neither	Neither answer is correct.
nervous	She feels nervous.
network	The network is down.
noise	I heard a loud noise.
noisy	The street is noisy.
none	None of them came.
normal	This is normal.
normally	I normally wake up early.
notice	Did you notice the sign?
novel	She wrote a novel.
nowhere	There is nowhere to sit.
nut	The nut is hard.
ocean	The ocean is deep.
offer	I accepted the offer.
officer	The officer checked my ticket.
oil	Add oil to the pan.
onto	Put it onto the shelf.
opportunity	This is a good opportunity.
option	Choose the best option.
ordinary	It was an ordinary day.
organization	The organization helps students.
organize	Please organize the files.
original	Keep the original receipt.
ourselves	We cooked dinner ourselves.
oven	The oven is hot.
owner	The owner opened the shop.
pack	Pack your bag now.
pain	I feel pain in my back.
painter	The painter finished the wall.
palace	The palace is old.
pants	These pants are too long.
parking	Parking is difficult here.
particular	I need a particular book.
pass	Pass me the salt.
passenger	Each passenger needs a ticket.
patient	Be patient with children.
pattern	This pattern is simple.
peace	We all want peace.
penny	I found a penny.
per	Tickets cost ten dollars per person.
per cent	Five per cent is small.
perform	The band will perform tonight.
perhaps	Perhaps she is at home.
permission	Ask permission first.
personality	He has a friendly personality.
pet	My pet is a cat.
petrol	The car needs petrol.
physical	Physical exercise helps health.
physics	Physics is difficult.
pick	Pick one card.
pilot	The pilot spoke clearly.
planet	Earth is a planet.
plastic	This bottle is plastic.
plate	Put food on the plate.
platform	Wait on platform two.
pleased	I am pleased to meet you.
pocket	The ticket is in my pocket.
polite	Be polite to everyone.
pollution	Pollution harms the ocean.
pop	I like pop music.
population	The population is growing.
position	Change your position.
possession	This ring is my possession.
possibility	There is a possibility of rain.
poster	Put the poster on the wall.
power	The computer needs power.
predict	We cannot predict the weather.
president	The president gave a speech.
prevent	Wash hands to prevent illness.
print	Print the document.
printer	The printer is broken.
prison	He went to prison.
prize	She won a prize.
process	The process takes time.
produce	Farms produce food.
professional	She is a professional dancer.
professor	The professor answered questions.
profile	Update your profile.
program	The program starts now.
progress	We made progress today.
promise	Keep your promise.
pronounce	Please pronounce this word.
protect	Protect your eyes.
provide	They provide free water.
pub	We met at the pub.
public	The park is public.
publish	They publish a magazine.
pull	Pull the door.
purpose	What is the purpose?
push	Push the button.
quality	The quality is high.
quantity	Check the quantity.
queen	The queen waved.
quietly	Speak quietly.
race (competition)	The race starts soon.
railway	The railway is closed.
raise	Raise your hand.
rate	The hotel rate is high.
rather	I am rather tired.
reach	Can you reach the shelf?
react	How did he react?
realize	I realize my mistake.
receive	Did you receive my message?
recent	This is a recent photo.
recently	I recently moved here.
reception	The reception is on Monday.
recipe	This recipe is easy.
recognize	I recognize that song.
recommend	I recommend this book.
record	Keep a record of payments.
recording	The recording sounds clear.
recycle	Recycle paper and plastic.
reduce	Reduce the heat.
refer	Refer to page two.
refuse1	I refuse to lie.
region	This region is cold.
regular	He is a regular customer.
relationship	Their relationship is strong.
remove	Remove your shoes.
repair	Repair the bike today.
replace	Replace the old battery.
reply	Please reply soon.
reporter	The reporter took notes.
request	I made a request.
research	We research local history.
researcher	The researcher checked the data.
respond	Please respond today.
response	Her response was quick.
rest (remaining part)	Eat the rest later.
rest (sleep/relax)	You need to rest.
review	Review your notes tonight.
ring1	She wore a gold ring.
ring2	Ring me after lunch.
rise	Prices rise every year.
rock (stone)	The rock is heavy.
`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a2_part_002_300_v1_contract_v0.json",
    rowReview: "outputs/oxford-vocabulary/row-reviews/oxford_3000_core_a2_part_002_300_v1_row_review_v1.jsonl",
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
    throw new Error(`A2 Part002 English example map validation failed:\n${problems.join("\n")}`);
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
      example_map_rule_version: "oxford-a2-part002-english-example-map-v1",
      script_path: "scripts/oxford/build-oxford-a2-part002-english-example-map.mjs",
      script_version: SCRIPT_VERSION,
      generated_at: generatedAt,
    };
  });
}

function updateContract(contract, mapPath, summaryPath, rows) {
  contract.latest_english_example_map = {
    map_id: "english_examples_map_v1",
    status: "reviewed_lunacards_authored_source_map_ready",
    script_path: "scripts/oxford/build-oxford-a2-part002-english-example-map.mjs",
    script_version: SCRIPT_VERSION,
    path: mapPath,
    summary_path: summaryPath,
    rows: rows.length,
    max_word_count: Math.max(...rows.map((row) => row.example_word_count)),
    example_source: "lunacards_authored_not_oxford",
    copied_oxford_examples: false,
  };
  contract.next_stage_options = [
    "Build English examples and US/UK edition layer from the reviewed A2 Part002 example map.",
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
    `# Oxford A2 Part002 English Example Map: ${RELEASE_ID}`,
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
    "- Source repair dependency: `a2_part002_light_source_row_repair_v1` corrected the parsed `light` verb row before this map was generated.",
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
