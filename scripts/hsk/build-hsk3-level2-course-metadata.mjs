import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "config/hsk3-level1-course-metadata.json");
const outputPath = path.join(ROOT, "config/hsk3-level2-course-metadata.json");

const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));

const descriptionReplacements = [
  [/HSK 1 vocabulary/gu, "HSK 2 vocabulary"],
  [/Vocabulario chino HSK 1/gu, "Vocabulario chino HSK 2"],
  [/Vocabulaire chinois HSK 1/gu, "Vocabulaire chinois HSK 2"],
  [/HSK 1-Chinesischwortschatz/gu, "HSK 2-Chinesischwortschatz"],
  [/Vocabolario cinese HSK 1/gu, "Vocabolario cinese HSK 2"],
  [/Vocabulário chinês HSK 1/gu, "Vocabulário chinês HSK 2"],
  [/Китайская лексика HSK 1/gu, "Китайская лексика HSK 2"],
  [/HSK 1の中国語語彙/gu, "HSK 2の中国語語彙"],
  [/HSK 1 중국어 어휘/gu, "HSK 2 중국어 어휘"],
  [/Từ vựng tiếng Trung HSK 1/gu, "Từ vựng tiếng Trung HSK 2"],
  [/คำศัพท์ภาษาจีน HSK 1/gu, "คำศัพท์ภาษาจีน HSK 2"],
  [/Perbendaharaan kata Cina HSK 1/gu, "Perbendaharaan kata Cina HSK 2"],
  [/Kosakata bahasa Cina HSK 1/gu, "Kosakata bahasa Cina HSK 2"],
  [/Słownictwo chińskie HSK 1/gu, "Słownictwo chińskie HSK 2"],
  [/Chinese woordenschat HSK 1/gu, "Chinese woordenschat HSK 2"],
  [/Kinesiskt ordförråd HSK 1/gu, "Kinesiskt ordförråd HSK 2"],
  [/Kinesisk ordforråd HSK 1/gu, "Kinesisk ordforråd HSK 2"],
  [/Kinesisk ordforråd til HSK 1/gu, "Kinesisk ordforråd til HSK 2"],
  [/Kiinan HSK 1 -sanasto/gu, "Kiinan HSK 2 -sanasto"],
  [/Čínská slovní zásoba HSK 1/gu, "Čínská slovní zásoba HSK 2"],
  [/Čínska slovná zásoba HSK 1/gu, "Čínska slovná zásoba HSK 2"],
  [/HSK 1 kínai szókincs/gu, "HSK 2 kínai szókincs"],
  [/Vocabular chinezesc HSK 1/gu, "Vocabular chinezesc HSK 2"],
  [/Китайска лексика HSK 1/gu, "Китайска лексика HSK 2"],
  [/Kineski vokabular HSK 1/gu, "Kineski vokabular HSK 2"],
  [/Кинески речник HSK 1/gu, "Кинески речник HSK 2"],
  [/Kitajsko besedišče HSK 1/gu, "Kitajsko besedišče HSK 2"],
  [/HSK 1 kinų žodynas/gu, "HSK 2 kinų žodynas"],
  [/HSK 1 ķīniešu vārdu krājums/gu, "HSK 2 ķīniešu vārdu krājums"],
  [/Hiina HSK 1 sõnavara/gu, "Hiina HSK 2 sõnavara"],
  [/Kínverskur HSK 1 orðaforði/gu, "Kínverskur HSK 2 orðaforði"],
  [/HSK 1 चीनी शब्दावली/gu, "HSK 2 चीनी शब्दावली"],
  [/HSK 1 চীনা শব্দভান্ডার/gu, "HSK 2 চীনা শব্দভান্ডার"],
  [/Bokabularyong Tsino HSK 1/gu, "Bokabularyong Tsino HSK 2"],
  [/HSK 1 တရုတ် ဝေါဟာရ/gu, "HSK 2 တရုတ် ဝေါဟာရ"],
  [/វាក្យសព្ទចិន HSK 1/gu, "វាក្យសព្ទចិន HSK 2"],
  [/ຄຳສັບພາສາຈີນ HSK 1/gu, "ຄຳສັບພາສາຈີນ HSK 2"],
  [/HSK 1 चिनियाँ शब्दावली/gu, "HSK 2 चिनियाँ शब्दावली"],
  [/HSK 1 චීන වචන මාලාව/gu, "HSK 2 චීන වචන මාලාව"],
  [/HSK 1 சீனச் சொல்வளம்/gu, "HSK 2 சீனச் சொல்வளம்"],
  [/HSK 1 చైనీస్ పదసంపద/gu, "HSK 2 చైనీస్ పదసంపద"],
  [/HSK 1 ಚೈನೀಸ್ ಪದಸಂಪತ್ತು/gu, "HSK 2 ಚೈನೀಸ್ ಪದಸಂಪತ್ತು"],
  [/HSK 1 ചൈനീസ് വാക്കുകൾ/gu, "HSK 2 ചൈനീസ് വാക്കുകൾ"],
  [/HSK 1 xitoycha lug‘at/gu, "HSK 2 xitoycha lug‘at"],
  [/HSK 1 қытай сөздігі/gu, "HSK 2 қытай сөздігі"],
  [/HSK 1 Çin dili lüğəti/gu, "HSK 2 Çin dili lüğəti"],
  [/HSK 1 ჩინური ლექსიკა/gu, "HSK 2 ჩინური ლექსიკა"],
  [/HSK 1 չինարեն բառապաշար/gu, "HSK 2 չինարեն բառապաշար"],
  [/HSK 1 Çince kelime bilgisi/gu, "HSK 2 Çince kelime bilgisi"],
  [/Msamiati wa Kichina HSK 1/gu, "Msamiati wa Kichina HSK 2"],
];

function level2Description(value) {
  let next = value;
  for (const [pattern, replacement] of descriptionReplacements) {
    next = next.replace(pattern, replacement);
  }
  if (next === value) {
    next = value.replace(/HSK 1/gu, "HSK 2");
  }
  next = next
    .replace(/HSK 2\.0:n mukaan \(2010-2021\)/gu, "HSK 3.0:n mukaan (2025)")
    .replace(/a HSK 2\.0 szerint \(2010-2021\)/gu, "a HSK 3.0 szerint (2025)")
    .replace(/HSK 2\.0 järgi \(2010-2021\)/gu, "HSK 3.0 järgi (2025)")
    .replace(/HSK 2\.0-ის \(2010-2021\) მიხედვით/gu, "HSK 3.0-ის (2025) მიხედვით")
    .replace(/HSK 2\.0-ի \(2010-2021\)/gu, "HSK 3.0-ի (2025)")
    .replace(/HSK 2\.0'a \(2010-2021\) göre/gu, "HSK 3.0'a (2025) göre");
  return next;
}

const output = {};
for (const [code, metadata] of Object.entries(source)) {
  output[code] = {
    title: "HSK 2.",
    description: level2Description(metadata.description),
    module: metadata.module,
    category: "HSK 2",
  };
}

await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath), languages: Object.keys(output).length }, null, 2));
