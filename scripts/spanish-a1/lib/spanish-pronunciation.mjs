const VOWEL_RE = /[aeiouáéíóúü]/iu;
const LETTER_TOKEN_RE = /\p{L}+/gu;
const ACCENT_MAP = new Map([
  ["á", "a"],
  ["é", "e"],
  ["í", "i"],
  ["ó", "o"],
  ["ú", "u"],
  ["Á", "a"],
  ["É", "e"],
  ["Í", "i"],
  ["Ó", "o"],
  ["Ú", "u"],
]);
const ONSET_CLUSTERS = new Set(["pr", "br", "tr", "dr", "cr", "gr", "fr", "pl", "bl", "cl", "gl", "fl", "tl"]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

function plainChar(char) {
  return ACCENT_MAP.get(char) ?? ACCENT_MAP.get(char.toLowerCase()) ?? char.toLowerCase();
}

function hasWrittenAccent(char) {
  return ACCENT_MAP.has(char);
}

function isVowel(char) {
  return VOWEL_RE.test(char);
}

function isWeakBase(char) {
  return ["i", "u", "ü"].includes(plainChar(char));
}

function isStrongForSyllable(char) {
  const plain = plainChar(char);
  return ["a", "e", "o"].includes(plain) || (isWeakBase(char) && hasWrittenAccent(char));
}

function isSilentU(chars, index) {
  const char = chars[index]?.toLowerCase();
  if (char !== "u") return false;
  const previous = chars[index - 1]?.toLowerCase();
  const next = plainChar(chars[index + 1] ?? "");
  if (!["e", "i"].includes(next)) return false;
  return previous === "q" || previous === "g";
}

function formsDiphthong(left, right) {
  if (!isVowel(left) || !isVowel(right)) return false;
  if (isStrongForSyllable(left) && isStrongForSyllable(right)) return false;
  return true;
}

function splitVowelRun(chars, start, end) {
  const nuclei = [];
  let index = start;
  while (index < end) {
    const currentStart = index;
    if (index + 1 < end && formsDiphthong(chars[index], chars[index + 1])) {
      if (
        index + 2 < end &&
        isWeakBase(chars[index]) &&
        !hasWrittenAccent(chars[index]) &&
        isStrongForSyllable(chars[index + 1]) &&
        isWeakBase(chars[index + 2]) &&
        !hasWrittenAccent(chars[index + 2])
      ) {
        nuclei.push({ start: currentStart, end: index + 3, accented: false });
        index += 3;
      } else {
        nuclei.push({
          start: currentStart,
          end: index + 2,
          accented: hasWrittenAccent(chars[index]) || hasWrittenAccent(chars[index + 1]),
        });
        index += 2;
      }
    } else {
      nuclei.push({ start: currentStart, end: index + 1, accented: hasWrittenAccent(chars[index]) });
      index += 1;
    }
  }
  return nuclei;
}

function findNuclei(chars) {
  const nuclei = [];
  for (let index = 0; index < chars.length; index += 1) {
    if (!isVowel(chars[index]) || isSilentU(chars, index)) continue;
    const start = index;
    let end = index + 1;
    while (end < chars.length && isVowel(chars[end]) && !isSilentU(chars, end)) end += 1;
    nuclei.push(...splitVowelRun(chars, start, end));
    index = end - 1;
  }
  return nuclei;
}

function stressedNucleusIndex(word, nuclei) {
  const accented = nuclei.findIndex((nucleus) =>
    word.slice(nucleus.start, nucleus.end).some((char) => hasWrittenAccent(char))
  );
  if (accented >= 0) return accented;
  const lastLetter = plainChar([...word].reverse().find((char) => /\p{L}/u.test(char)) ?? "");
  return ["a", "e", "i", "o", "u", "n", "s"].includes(lastLetter)
    ? Math.max(0, nuclei.length - 2)
    : nuclei.length - 1;
}

function syllableStartForNucleus(chars, nuclei, index) {
  if (index <= 0) return 0;
  const previousEnd = nuclei[index - 1].end;
  const currentStart = nuclei[index].start;
  const cluster = [];
  for (let position = previousEnd; position < currentStart; position += 1) {
    const char = plainChar(chars[position]);
    if (!/\p{L}/u.test(char) || char === "h" || isSilentU(chars, position)) continue;
    cluster.push({ char, position });
  }
  if (!cluster.length) return currentStart;
  if (cluster.length === 1) return cluster[0].position;
  const lastTwo = `${cluster[cluster.length - 2].char}${cluster[cluster.length - 1].char}`;
  if (ONSET_CLUSTERS.has(lastTwo)) return cluster[cluster.length - 2].position;
  return cluster[cluster.length - 1].position;
}

function nextPlain(chars, index) {
  return plainChar(chars[index + 1] ?? "");
}

function previousPlain(chars, index) {
  return plainChar(chars[index - 1] ?? "");
}

function adjacentEffectiveVowel(chars, index) {
  return (
    (isVowel(chars[index - 1] ?? "") && !isSilentU(chars, index - 1)) ||
    (isVowel(chars[index + 1] ?? "") && !isSilentU(chars, index + 1))
  );
}

function segmentWord(word, variant) {
  const chars = [...word.normalize("NFC").toLowerCase()];
  const segments = [];
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const plain = plainChar(char);
    const next = nextPlain(chars, index);
    const previous = previousPlain(chars, index);
    const nextRaw = chars[index + 1]?.toLowerCase();

    if (plain === "h") {
      segments.push({ start: index, end: index + 1, ipa: "" });
      continue;
    }
    if (plain === "c" && nextRaw === "h") {
      segments.push({ start: index, end: index + 2, ipa: "tʃ" });
      index += 1;
      continue;
    }
    if (plain === "l" && nextRaw === "l") {
      segments.push({ start: index, end: index + 2, ipa: "ʝ" });
      index += 1;
      continue;
    }
    if (plain === "r" && nextRaw === "r") {
      segments.push({ start: index, end: index + 2, ipa: "r" });
      index += 1;
      continue;
    }
    if (plain === "q" && chars[index + 1]?.toLowerCase() === "u" && ["e", "i"].includes(plainChar(chars[index + 2] ?? ""))) {
      segments.push({ start: index, end: index + 2, ipa: "k" });
      index += 1;
      continue;
    }
    if (plain === "g" && chars[index + 1]?.toLowerCase() === "u" && ["e", "i"].includes(plainChar(chars[index + 2] ?? ""))) {
      segments.push({ start: index, end: index + 2, ipa: "g" });
      index += 1;
      continue;
    }

    let ipa = "";
    if (plain === "a") ipa = "a";
    else if (plain === "e") ipa = "e";
    else if (plain === "o") ipa = "o";
    else if (plain === "i") ipa = !hasWrittenAccent(char) && adjacentEffectiveVowel(chars, index) ? "j" : "i";
    else if (plain === "u" || plain === "ü") ipa = !hasWrittenAccent(char) && adjacentEffectiveVowel(chars, index) ? "w" : "u";
    else if (plain === "b" || plain === "v") ipa = "b";
    else if (plain === "c") ipa = ["e", "i"].includes(next) ? (variant === "ES" ? "θ" : "s") : "k";
    else if (plain === "d") ipa = "d";
    else if (plain === "f") ipa = "f";
    else if (plain === "g") ipa = ["e", "i"].includes(next) ? "x" : "g";
    else if (plain === "j") ipa = "x";
    else if (plain === "k") ipa = "k";
    else if (plain === "l") ipa = "l";
    else if (plain === "m") ipa = "m";
    else if (plain === "n") ipa = "n";
    else if (plain === "ñ") ipa = "ɲ";
    else if (plain === "p") ipa = "p";
    else if (plain === "r") ipa = index === 0 || ["l", "n", "s"].includes(previous) ? "r" : "ɾ";
    else if (plain === "s") ipa = "s";
    else if (plain === "t") ipa = "t";
    else if (plain === "w") ipa = "w";
    else if (plain === "x") ipa = /^(méxico|mexico|mexicana|mexicano|mexicanas|mexicanos)$/u.test(chars.join("")) ? "x" : "ks";
    else if (plain === "y") ipa = chars.length === 1 || index === chars.length - 1 ? "i" : "ʝ";
    else if (plain === "z") ipa = variant === "ES" ? "θ" : "s";
    else ipa = plain;
    segments.push({ start: index, end: index + 1, ipa });
  }
  return { chars, segments };
}

export function transcribeSpanishWord(word, variant = "ES") {
  const normalized = normalizeText(word);
  if (!normalized) return "";
  const { chars, segments } = segmentWord(normalized, variant);
  const nuclei = findNuclei(chars);
  const stressStart =
    nuclei.length > 1 ? syllableStartForNucleus(chars, nuclei, stressedNucleusIndex(chars, nuclei)) : null;
  let stressInserted = false;
  let output = "";
  for (const segment of segments) {
    if (stressStart !== null && !stressInserted && segment.ipa && segment.start >= stressStart) {
      output += "ˈ";
      stressInserted = true;
    }
    output += segment.ipa;
  }
  return output;
}

export function transcribeSpanishText(value, variant = "ES") {
  const text = normalizeText(value);
  if (!text) return "";
  const pieces = [];
  let cursor = 0;
  for (const match of text.matchAll(LETTER_TOKEN_RE)) {
    if (match.index > cursor) pieces.push(" ");
    pieces.push(transcribeSpanishWord(match[0], variant));
    cursor = match.index + match[0].length;
  }
  const ipa = pieces.join(" ").replace(/\s+/gu, " ").trim();
  return ipa ? `/${ipa}/` : "";
}

export function isSpanishA1Ipa(value) {
  const text = normalizeText(value);
  return /^\/[^/\s](?:.*[^/\s])?\/$/u.test(text);
}
