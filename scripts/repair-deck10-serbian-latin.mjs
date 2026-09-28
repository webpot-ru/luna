#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DECK_PATH = "data/decks/home_furniture_basics_a1.json";
const SET_ID = "home_furniture_basics_a1";
const EXPECTED_SOURCE_SHA256 = "a59feeafdc899becd65619917dc1b4ab897ba6cc7a32311032ff231a35850d3a";
const CYRILLIC = /\p{Script=Cyrillic}/u;
const LETTERS = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž", з: "z", и: "i",
  ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r",
  с: "s", т: "t", ћ: "ć", у: "u", ф: "f", х: "h", ц: "c", ч: "č", џ: "dž", ш: "š",
};

export function transliterateSerbianCyrillic(value) {
  return [...String(value)].map((letter) => {
    const latin = LETTERS[letter.toLowerCase()];
    if (!latin) {
      if (CYRILLIC.test(letter)) throw new Error(`Unmapped Serbian Cyrillic letter: ${letter}`);
      return letter;
    }
    return letter === letter.toUpperCase() ? latin[0].toUpperCase() + latin.slice(1) : latin;
  }).join("");
}

export function repairDeckSerbianLatin(deck) {
  if (deck.setId !== SET_ID) throw new Error(`Unexpected deck: ${deck.setId}`);
  let changedFields = 0;
  const changedMeanings = new Set();
  for (const [support, targets] of Object.entries(deck.cards || {})) {
    for (const [target, rows] of Object.entries(targets)) {
      for (const row of rows) {
        const fields = [
          ...(support === "SR" ? ["support_word", "support_display", "support_example"] : []),
          ...(target === "SR" ? ["target_word", "target_display", "target_example"] : []),
        ];
        for (const field of fields) {
          if (typeof row[field] !== "string") throw new Error(`${support}/${target}/${row.meaning_id}: missing ${field}`);
          const converted = transliterateSerbianCyrillic(row[field]);
          if (converted !== row[field]) {
            row[field] = converted;
            changedFields += 1;
            changedMeanings.add(row.meaning_id);
          }
          if (CYRILLIC.test(row[field])) throw new Error(`${support}/${target}/${row.meaning_id}: Cyrillic remains in ${field}`);
        }
      }
    }
  }
  for (const section of ["titles", "descriptions", "levelSignals"]) {
    if (typeof deck[section]?.SR !== "string" || CYRILLIC.test(deck[section].SR)) {
      throw new Error(`${section}.SR must already use Serbian Latin`);
    }
  }
  for (const [field, translations] of Object.entries(deck.courseMetadata || {})) {
    if (typeof translations?.SR !== "string" || CYRILLIC.test(translations.SR)) {
      throw new Error(`courseMetadata.${field}.SR must already use Serbian Latin`);
    }
  }
  return { changedFields, changedMeaningCount: changedMeanings.size, cardCount: 30 };
}

function main() {
  const apply = process.argv.slice(2).includes("--apply");
  if (process.argv.slice(2).some((arg) => arg !== "--apply")) throw new Error("Only --apply is supported");
  const source = fs.readFileSync(DECK_PATH);
  const sha256 = crypto.createHash("sha256").update(source).digest("hex");
  if (sha256 !== EXPECTED_SOURCE_SHA256) throw new Error(`Unexpected source SHA-256: ${sha256}`);
  const deck = JSON.parse(source.toString("utf8"));
  const result = repairDeckSerbianLatin(deck);
  if (result.changedFields !== 3816 || result.changedMeaningCount !== 12) {
    throw new Error(`Unexpected SR change scope: ${JSON.stringify(result)}`);
  }
  const output = `${JSON.stringify(deck, null, 2)}\n`;
  const nextSha256 = crypto.createHash("sha256").update(output).digest("hex");
  if (apply) fs.writeFileSync(DECK_PATH, output, "utf8");
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", sourceSha256: sha256, nextSha256, ...result }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
