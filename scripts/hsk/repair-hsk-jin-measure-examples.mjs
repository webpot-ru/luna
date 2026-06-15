#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_DIR = path.join(ROOT, "config");
const REPORT_PATH = path.join(ROOT, "outputs/hsk/qa/hsk_jin_measure_naturalness_repair_20260605.json");

const hsk3JinExamples = {
  EN: "I bought about one kilogram of apples.",
  ES: "Compré aproximadamente un kilo de manzanas.",
  FR: "J'ai acheté environ un kilo de pommes.",
  DE: "Ich habe etwa ein Kilo Äpfel gekauft.",
  IT: "Ho comprato circa un chilo di mele.",
  PT: "Comprei cerca de um quilo de maçãs.",
  RU: "Я купил около килограмма яблок.",
  JA: "りんごを約1キロ買いました。",
  KO: "사과를 약 1킬로그램 샀어요.",
  VI: "Tôi mua khoảng một ký táo.",
  TH: "ฉันซื้อแอปเปิลประมาณหนึ่งกิโลกรัม",
  MS: "Saya membeli kira-kira satu kilogram epal.",
  ID: "Saya membeli sekitar satu kilogram apel.",
  PL: "Kupiłem około kilograma jabłek.",
  NL: "Ik heb ongeveer een kilo appels gekocht.",
  SV: "Jag köpte ungefär ett kilo äpplen.",
  NO: "Jeg kjøpte omtrent ett kilo epler.",
  DA: "Jeg købte cirka et kilo æbler.",
  FI: "Ostin noin kilon omenoita.",
  CS: "Koupil jsem asi kilogram jablek.",
  SK: "Kúpil som asi kilogram jabĺk.",
  HU: "Vettem körülbelül egy kiló almát.",
  RO: "Am cumpărat aproximativ un kilogram de mere.",
  BG: "Купих около килограм ябълки.",
  HR: "Kupio sam oko kilogram jabuka.",
  SR: "Kupio sam oko kilogram jabuka.",
  SL: "Kupil sem približno kilogram jabolk.",
  LT: "Nupirkau apie kilogramą obuolių.",
  LV: "Nopirku apmēram kilogramu ābolu.",
  ET: "Ostsin umbes kilo õunu.",
  IS: "Ég keypti um það bil kíló af eplum.",
  HI: "मैंने लगभग एक किलो सेब खरीदे।",
  BN: "আমি প্রায় এক কেজি আপেল কিনেছি।",
  TL: "Bumili ako ng halos isang kilo ng mansanas.",
  MY: "ပန်းသီး တစ်ကီလိုလောက် ဝယ်ခဲ့တယ်။",
  KM: "ខ្ញុំបានទិញផ្លែប៉ោមប្រហែលមួយគីឡូក្រាម។",
  LO: "ຂ້ອຍຊື້ໝາກແອບເປີນປະມານໜຶ່ງກິໂລ.",
  NE: "मैले करिब एक किलो स्याउ किनेँ।",
  SI: "මම ඇපල් කිලෝ එකක් විතර මිලදී ගත්තා.",
  TA: "நான் சுமார் ஒரு கிலோ ஆப்பிள் வாங்கினேன்.",
  TE: "నేను సుమారు ఒక కిలో ఆపిల్లు కొనుగోలు చేశాను.",
  KN: "ನಾನು ಸುಮಾರು ಒಂದು ಕಿಲೋ ಸೇಬುಗಳನ್ನು ಖರೀದಿಸಿದೆ.",
  ML: "ഞാൻ ഏകദേശം ഒരു കിലോ ആപ്പിൾ വാങ്ങി.",
  UZ: "Taxminan bir kilogramm olma sotib oldim.",
  KK: "Мен шамамен бір килограмм алма сатып алдым.",
  AZ: "Təxminən bir kiloqram alma aldım.",
  KA: "დაახლოებით ერთი კილოგრამი ვაშლი ვიყიდე.",
  HY: "Ես մոտ մեկ կիլոգրամ խնձոր գնեցի։",
  TR: "Yaklaşık bir kilo elma aldım.",
  SW: "Nilinunua takriban kilo moja ya tufaha.",
  "PT-BR": "Comprei cerca de um quilo de maçãs.",
  "ES-419": "Compré aproximadamente un kilo de manzanas.",
  "EN-GB": "I bought about one kilogram of apples.",
};

const classicHsk4GrapeExamples = {
  EN: "Grapes are five yuan for half a kilo.",
  ES: "Las uvas cuestan cinco yuanes por medio kilo.",
  FR: "Les raisins coûtent cinq yuans le demi-kilo.",
  DE: "Die Trauben kosten fünf Yuan pro 500 Gramm.",
  IT: "L'uva costa cinque yuan per mezzo chilo.",
  PT: "As uvas custam cinco yuans por meio quilo.",
  RU: "Виноград стоит пять юаней за полкило.",
  JA: "ぶどうは500グラムで5元です。",
  KO: "포도는 500그램에 5위안이에요.",
  VI: "Nho năm nhân dân tệ nửa ký.",
  TH: "องุ่นห้าหยวนต่อครึ่งกิโลกรัม",
  MS: "Anggur lima yuan untuk setengah kilo.",
  ID: "Anggur lima yuan per setengah kilo.",
  PL: "Winogrona kosztują pięć yuanów za pół kilograma.",
  NL: "Druiven kosten vijf yuan per halve kilo.",
  SV: "Druvor kostar fem yuan per halvkilo.",
  NO: "Druer koster fem yuan per halvkilo.",
  DA: "Druer koster fem yuan per halvt kilo.",
  FI: "Rypäleet maksavat viisi yuania puolelta kilolta.",
  CS: "Vinné hrozny stojí pět jüanů za půl kila.",
  SK: "Hrozno stojí päť jüanov za pol kila.",
  HU: "A szőlő fél kilója öt jüan.",
  RO: "Strugurii costă cinci yuani la jumătate de kilogram.",
  BG: "Гроздето струва пет юана за половин килограм.",
  HR: "Grožđe stoji pet juana za pola kilograma.",
  SR: "Грожђе кошта пет јуана за пола килограма.",
  SL: "Grozdje stane pet juanov za pol kilograma.",
  LT: "Vynuogės kainuoja penkis juanius už pusę kilogramo.",
  LV: "Vīnogas maksā piecus juaņus par puskilogramu.",
  ET: "Viinamarjad maksavad viis jüaani poole kilo eest.",
  IS: "Vínberin kosta fimm júan fyrir hálft kíló.",
  HI: "अंगूर आधा किलो पाँच युआन हैं।",
  BN: "আঙুর আধা কেজি পাঁচ ইউয়ান।",
  TL: "Limang yuan ang bawat kalahating kilo ng ubas.",
  MY: "စပျစ်သီးက ကီလိုဝက်ကို ငါးယွမ် ဖြစ်သည်။",
  KM: "ទំពាំងបាយជូរកន្លះគីឡូក្រាមតម្លៃប្រាំយ័ន។",
  LO: "ໝາກອະງຸ່ນເຄິ່ງກິໂລລາຄາຫ້າຢວນ.",
  NE: "अङ्गुर आधा किलो पाँच युआन हो.",
  SI: "මිදි කිලෝ භාගයකට යුවාන් පහකි.",
  TA: "திராட்சை அரைக் கிலோக்கு ஐந்து யுவான்.",
  TE: "ద్రాక్ష అర కిలోకు ఐదు యువాన్.",
  KN: "ದ್ರಾಕ್ಷಿ ಅರ್ಧ ಕಿಲೋಗೆ ಐದು ಯುವಾನ್.",
  ML: "മുന്തിരി അര കിലോയ്ക്ക് അഞ്ച് യുവാനാണ്.",
  UZ: "Uzum yarim kilosiga besh yuan.",
  KK: "Жүзім жарты килограммға бес юань.",
  AZ: "Üzümün yarım kilosu beş yuandır.",
  KA: "ყურძენი ნახევარ კილოზე ხუთი იუანი ღირს.",
  HY: "Խաղողի կես կիլոգրամը հինգ յուան է։",
  TR: "Üzüm yarım kilo başına beş yuan.",
  SW: "Zabibu ni yuan tano kwa nusu kilo.",
  "PT-BR": "As uvas custam cinco yuans por meio quilo.",
  "ES-419": "Las uvas cuestan cinco yuanes por medio kilo.",
  "EN-GB": "Grapes are five yuan for half a kilo.",
};

function parseTsv(text) {
  const lines = text.trimEnd().split(/\r?\n/u);
  const headers = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => line.split("\t"));
  return { headers, rows };
}

function serializeTsv({ headers, rows }) {
  return [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n") + "\n";
}

async function updateJsonExample(relativePath, key, newExample) {
  const filePath = path.join(ROOT, relativePath);
  const data = JSON.parse(await fs.readFile(filePath, "utf8"));
  if (!data[key]) throw new Error(`${relativePath} missing key ${key}`);
  const before = data[key].example_en;
  data[key].example_en = newExample;
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
  return { file: relativePath, key, field: "example_en", before, after: newExample };
}

async function updateTsvRowExamples({ relativePath, rowMatcher, languageExamples }) {
  const filePath = path.join(ROOT, relativePath);
  const parsed = parseTsv(await fs.readFile(filePath, "utf8"));
  const row = parsed.rows.find((candidate) => rowMatcher(parsed.headers, candidate));
  if (!row) throw new Error(`${relativePath} missing repair row`);
  const changes = [];
  for (const [code, newExample] of Object.entries(languageExamples)) {
    const column = parsed.headers.indexOf(`example_${code}`);
    if (column === -1) continue;
    const before = row[column];
    row[column] = newExample;
    if (before !== newExample) {
      changes.push({ file: relativePath, language_code: code, before, after: newExample });
    }
  }
  await fs.writeFile(filePath, serializeTsv(parsed));
  return changes;
}

const configNames = await fs.readdir(CONFIG_DIR);
const changes = [];

changes.push(await updateJsonExample("config/hsk3-level3-examples.json", "716:斤", hsk3JinExamples.EN));
changes.push(await updateJsonExample("config/hsk-classic-hsk4-examples.json", "葡萄", classicHsk4GrapeExamples.EN));

for (const name of configNames.filter((name) => /^hsk3-level3-manual-translations-.+\.tsv$/u.test(name)).sort()) {
  changes.push(
    ...(await updateTsvRowExamples({
      relativePath: `config/${name}`,
      rowMatcher: (headers, row) => row[headers.indexOf("hsk_key")] === "716:斤",
      languageExamples: hsk3JinExamples,
    }))
  );
}

for (const name of configNames.filter((name) => /^hsk-classic-hsk4-translations-.+\.tsv$/u.test(name)).sort()) {
  changes.push(
    ...(await updateTsvRowExamples({
      relativePath: `config/${name}`,
      rowMatcher: (headers, row) => row[headers.indexOf("simplified")] === "葡萄",
      languageExamples: classicHsk4GrapeExamples,
    }))
  );
}

const report = {
  generated_at: new Date().toISOString(),
  status: "ok",
  scope: "HSK-only repair for standalone 斤/catty-style learner-facing target examples.",
  changed_cells: changes.filter((change) => change.before !== change.after).length,
  touched_files: [...new Set(changes.map((change) => change.file))].sort(),
  changes,
};

await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, changed_cells: report.changed_cells, touched_files: report.touched_files.length, report: path.relative(ROOT, REPORT_PATH) }, null, 2));
