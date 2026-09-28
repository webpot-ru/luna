import assert from "node:assert/strict";
import fs from "node:fs";
import { repairDeckSerbianLatin, transliterateSerbianCyrillic } from "./repair-deck10-serbian-latin.mjs";

assert.equal(transliterateSerbianCyrillic("Намештај је у соби."), "Nameštaj je u sobi.");
assert.equal(transliterateSerbianCyrillic("полица за књиге"), "polica za knjige");
assert.equal(transliterateSerbianCyrillic("Љиљана и Џем"), "Ljiljana i Džem");
assert.throws(() => transliterateSerbianCyrillic("ы"), /Unmapped Serbian Cyrillic/);

const deck = JSON.parse(fs.readFileSync("data/decks/home_furniture_basics_a1.json", "utf8"));
assert.equal(deck.cards.SR.AZ[0].support_display, "nameštaj");
assert.equal(deck.cards.AZ.SR[0].target_display, "nameštaj");
assert.equal(deck.cards.SR.AZ[0].support_example, "Nameštaj je u sobi.");
const idempotent = repairDeckSerbianLatin(structuredClone(deck));
assert.equal(idempotent.changedFields, 0);
assert.equal(idempotent.changedMeaningCount, 0);
for (const [support, targets] of Object.entries(deck.cards)) {
  for (const [target, rows] of Object.entries(targets)) {
    for (const row of rows) {
      const fields = [
        ...(support === "SR" ? ["support_word", "support_display", "support_example"] : []),
        ...(target === "SR" ? ["target_word", "target_display", "target_example"] : []),
      ];
      for (const field of fields) {
        assert.doesNotMatch(row[field], /\p{Script=Cyrillic}/u, `${support}/${target}/${row.meaning_id}/${field}`);
      }
    }
  }
}
console.log("Deck 10 Serbian Latin repair tests passed");
