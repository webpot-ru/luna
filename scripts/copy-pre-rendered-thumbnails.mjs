#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(
  ROOT,
  "outputs/design-prototypes/youtube-thumbnail-home_kitchen_cookware_pilot_01-ordinary-target-language-large-pair-folders-20260704/manifest.json"
);
const VIDEO_GENERATOR_DIR = path.join(ROOT, "outputs/video-generator");

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findMetadataFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMetadataFiles(fullPath));
    } else if (entry.name === "youtube_metadata.json") {
      results.push(fullPath);
    }
  }
  return results;
}

function supportFolderName(support) {
  const map = {
    "EN": "EN__English",
    "EN-GB": "EN-GB__English-United-Kingdom",
    "ES": "ES__Spanish",
    "ES-419": "ES-419__Spanish-Latin-America",
    "PT": "PT__Portuguese",
    "PT-BR": "PT-BR__Portuguese-Brazil",
    "JA": "JA__Japanese",
    "TR": "TR__Turkish",
    "VI": "VI__Vietnamese",
    "TH": "TH__Thai",
    "MY": "MY__Burmese",
    "NE": "NE__Nepali",
    "SW": "SW__Swahili",
    "RU": "RU__Russian",
    "SR": "SR__Serbian-Latin"
  };
  return map[support] || support;
}

function pairFolderName(support, target) {
  const nameMap = {
    "AZ": "Azerbaijani", "BG": "Bulgarian", "BN": "Bangla", "CS": "Czech",
    "DA": "Danish", "DE": "German", "EN": "English", "EN-GB": "English-United-Kingdom",
    "ES": "Spanish", "ES-419": "Spanish-Latin-America", "ET": "Estonian",
    "FI": "Finnish", "FR": "French", "HI": "Hindi", "HR": "Croatian",
    "HU": "Hungarian", "HY": "Armenian", "ID": "Indonesian", "IS": "Icelandic",
    "IT": "Italian", "JA": "Japanese", "KA": "Georgian", "KK": "Kazakh",
    "KM": "Khmer", "KN": "Kannada", "KO": "Korean", "LO": "Lao",
    "LT": "Lithuanian", "LV": "Latvian", "ML": "Malayalam", "MS": "Malay",
    "MY": "Burmese", "NB": "Norwegian-Bokmal", "NE": "Nepali", "NL": "Dutch",
    "NO": "Norwegian-Bokmal", "PL": "Polish", "PT-BR": "Portuguese-Brazil",
    "PT": "Portuguese", "RO": "Romanian", "RU": "Russian", "SI": "Sinhala",
    "SK": "Slovak", "SL": "Slovenian", "SR": "Serbian-Latin", "SV": "Swedish",
    "TH": "Thai", "VI": "Vietnamese", "ZH": "Chinese"
  };
  const sName = nameMap[support] || support;
  const tName = nameMap[target] || target;
  return `${support}__${target}__${sName}_to_${tName}`;
}

async function main() {
  const manifest = loadJson(MANIFEST_PATH);
  if (!manifest) {
    console.error(`Manifest not found at ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const metadataFiles = findMetadataFiles(VIDEO_GENERATOR_DIR);
  console.log(`Found ${metadataFiles.length} metadata files in outputs/video-generator/`);

  let copiedCount = 0;

  for (const metaFile of metadataFiles) {
    const meta = loadJson(metaFile);
    if (!meta) continue;

    const { supportLang, targetLang, setId } = meta;
    if (!supportLang || !targetLang) continue;

    // Resolve pre-rendered cover directory in manifest
    const sFolder = supportFolderName(supportLang);
    const pFolder = pairFolderName(supportLang, targetLang);
    const sourceCoverPath = path.join(
      path.dirname(MANIFEST_PATH),
      "by-support",
      sFolder,
      pFolder,
      "youtube_thumbnail.jpg"
    );

    if (fs.existsSync(sourceCoverPath)) {
      const destCoverPath = path.join(path.dirname(metaFile), "youtube_thumbnail.jpg");
      fs.copyFileSync(sourceCoverPath, destCoverPath);
      
      // Update metadata json to point to the local thumbnail
      meta.thumbnailPath = "youtube_thumbnail.jpg";
      meta.thumbnailUploadMode = "custom";
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n", "utf8");
      
      console.log(`Copied cover for ${supportLang}->${targetLang} to ${path.relative(ROOT, destCoverPath)}`);
      copiedCount++;
    } else {
      console.log(`Pre-rendered cover NOT found for ${supportLang}->${targetLang} at: ${path.relative(ROOT, sourceCoverPath)}`);
    }
  }

  console.log(`\nSuccessfully matched and copied ${copiedCount} pre-rendered covers to video generator outputs.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
