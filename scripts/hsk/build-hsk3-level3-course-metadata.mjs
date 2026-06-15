import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "config/hsk3-level1-course-metadata.json");
const outputPath = path.join(ROOT, "config/hsk3-level3-course-metadata.json");

const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));

function level3Description(value) {
  return String(value)
    .replace(/HSK 1 vocabulary/gu, "HSK 3 vocabulary")
    .replace(/Vocabulario chino HSK 1/gu, "Vocabulario chino HSK 3")
    .replace(/Vocabulaire chinois HSK 1/gu, "Vocabulaire chinois HSK 3")
    .replace(/HSK 1-Chinesischwortschatz/gu, "HSK 3-Chinesischwortschatz")
    .replace(/Vocabolario cinese HSK 1/gu, "Vocabolario cinese HSK 3")
    .replace(/Vocabulário chinês HSK 1/gu, "Vocabulário chinês HSK 3")
    .replace(/Лексика HSK 1/gu, "Лексика HSK 3")
    .replace(/HSK 1の中国語語彙/gu, "HSK 3の中国語語彙")
    .replace(/HSK 1 중국어 어휘/gu, "HSK 3 중국어 어휘")
    .replace(/Từ vựng tiếng Trung HSK 1/gu, "Từ vựng tiếng Trung HSK 3")
    .replace(/คำศัพท์จีน HSK 1/gu, "คำศัพท์จีน HSK 3")
    .replace(/Perbendaharaan kata Cina HSK 1/gu, "Perbendaharaan kata Cina HSK 3")
    .replace(/Kosakata bahasa Cina HSK 1/gu, "Kosakata bahasa Cina HSK 3")
    .replace(/Słownictwo chińskie HSK 1/gu, "Słownictwo chińskie HSK 3")
    .replace(/Chinese woordenschat HSK 1/gu, "Chinese woordenschat HSK 3")
    .replace(/Kinesiskt ordförråd HSK 1/gu, "Kinesiskt ordförråd HSK 3")
    .replace(/Kinesisk ordforråd(?: til)? HSK 1/gu, (match) => match.replace("HSK 1", "HSK 3"))
    .replace(/Kiinan HSK 1 -sanasto/gu, "Kiinan HSK 3 -sanasto")
    .replace(/Čínská slovní zásoba HSK 1/gu, "Čínská slovní zásoba HSK 3")
    .replace(/Čínska slovná zásoba HSK 1/gu, "Čínska slovná zásoba HSK 3")
    .replace(/HSK 1 kínai szókincs/gu, "HSK 3 kínai szókincs")
    .replace(/Vocabular chinezesc HSK 1/gu, "Vocabular chinezesc HSK 3")
    .replace(/Китайска лексика HSK 1/gu, "Китайска лексика HSK 3")
    .replace(/Kineski vokabular HSK 1/gu, "Kineski vokabular HSK 3")
    .replace(/Кинески речник HSK 1/gu, "Кинески речник HSK 3")
    .replace(/Kitajsko besedišče HSK 1/gu, "Kitajsko besedišče HSK 3")
    .replace(/HSK 1 kinų žodynas/gu, "HSK 3 kinų žodynas")
    .replace(/HSK 1 ķīniešu vārdu krājums/gu, "HSK 3 ķīniešu vārdu krājums")
    .replace(/Hiina HSK 1 sõnavara/gu, "Hiina HSK 3 sõnavara")
    .replace(/Kínverskur HSK 1 orðaforði/gu, "Kínverskur HSK 3 orðaforði")
    .replace(/HSK 1 चीनी शब्दावली/gu, "HSK 3 चीनी शब्दावली")
    .replace(/HSK 1 चिनी शब्दावली/gu, "HSK 3 चिनी शब्दावली")
    .replace(/HSK 1 চীনা শব্দভান্ডার/gu, "HSK 3 চীনা শব্দভান্ডার")
    .replace(/Bokabularyong Tsino HSK 1/gu, "Bokabularyong Tsino HSK 3")
    .replace(/HSK 1 တရုတ် ဝေါဟာရ/gu, "HSK 3 တရုတ် ဝေါဟာရ")
    .replace(/វាក្យសព្ទចិន HSK 1/gu, "វាក្យសព្ទចិន HSK 3")
    .replace(/ຄຳສັບຈີນ HSK 1/gu, "ຄຳສັບຈີນ HSK 3")
    .replace(/HSK 1 नेपाली चिनियाँ शब्दावली/gu, "HSK 3 नेपाली चिनियाँ शब्दावली")
    .replace(/HSK 1 චීන වචන මාලාව/gu, "HSK 3 චීන වචන මාලාව")
    .replace(/HSK 1 சீனச் சொல்வளம்/gu, "HSK 3 சீனச் சொல்வளம்")
    .replace(/HSK 1 చైనీస్ పదసంపద/gu, "HSK 3 చైనీస్ పదసంపద")
    .replace(/HSK 1 ಚೈನೀಸ್ ಪದಸಂಪತ್ತು/gu, "HSK 3 ಚೈನೀಸ್ ಪದಸಂಪತ್ತು")
    .replace(/HSK 1 ചൈനീസ് വാക്കുകൾ/gu, "HSK 3 ചൈനീസ് വാക്കുകൾ")
    .replace(/HSK 1 xitoycha lug‘at/gu, "HSK 3 xitoycha lug‘at")
    .replace(/HSK 1 қытай сөздігі/gu, "HSK 3 қытай сөздігі")
    .replace(/HSK 1 Çin dili lüğəti/gu, "HSK 3 Çin dili lüğəti")
    .replace(/HSK 1 ჩინური ლექსიკა/gu, "HSK 3 ჩინური ლექსიკა")
    .replace(/HSK 1 չինարեն բառապաշար/gu, "HSK 3 չինարեն բառապաշար")
    .replace(/HSK 1 Çince kelime bilgisi/gu, "HSK 3 Çince kelime bilgisi")
    .replace(/Msamiati wa Kichina HSK 1/gu, "Msamiati wa Kichina HSK 3")
    .replace(/HSK 1/gu, "HSK 3");
}

const output = {};
for (const [code, metadata] of Object.entries(source)) {
  output[code] = {
    title: "HSK 3.",
    description: level3Description(metadata.description),
    module: metadata.module,
    category: "HSK 3",
  };
}

await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(ROOT, outputPath), languages: Object.keys(output).length }, null, 2));
