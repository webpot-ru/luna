const hardAnchorLanguages = new Set(["EN", "EN-GB", "RU"]);
const articleAndFunctionWords = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "for",
  "de",
  "del",
  "la",
  "el",
  "le",
  "les",
  "des",
  "der",
  "die",
  "das",
  "для",
  "в",
  "на",
  "и",
  "с",
]);
const broadCompoundHeads = new Set([
  "soap",
  "towel",
  "shower",
  "bath",
  "bathroom",
  "kitchen",
  "food",
  "storage",
  "toothbrush",
  "мыло",
  "мыла",
  "полотенце",
  "душ",
  "ванной",
  "кухонный",
]);

const lexicalAnchorAliasesByLanguageAndDisplay = new Map([
  ["AZ::insanlar", ["İnsanlar"]],
  ["BN::এটা", ["এই"]],
  ["BN::ওটা", ["ওই"]],
  ["BG::кой", ["коя", "кое", "кои"]],
  ["BG::чий", ["чия", "чие", "чии"]],
  ["CS::který", ["která", "které", "kteří"]],
  ["DA::denne", ["dette"]],
  ["HR::koji", ["koja", "koje", "koji"]],
  ["HR::čiji", ["čija", "čije", "čiji"]],
  ["HY::դա", ["այդ"]],
  ["HY::որը", ["որն"]],
  ["KA::ჩვილი", ["ჩვილს"]],
  ["KA::ის; ის კაცი", ["მას"]],
  ["KA::ის; ის ქალი", ["მას"]],
  ["KA::ისინი", ["მათ"]],
  ["KN::ಇದು", ["ಈ"]],
  ["KN::ಅದು", ["ಆ"]],
  ["KN::ಅವು", ["ಆ"]],
  ["KO::이것", ["이"]],
  ["KO::저것", ["저"]],
  ["KO::누구", ["누가"]],
  ["LT::kuris", ["kuri", "kurie", "kurios"]],
  ["LV::kurš", ["kura", "kuri", "kuras"]],
  ["ML::ഇത്", ["ഈ"]],
  ["ML::അത്", ["ആ"]],
  ["ML::ഇവ", ["ഈ"]],
  ["ML::അവ", ["ആ"]],
  ["NB::entré", ["entreen"]],
  ["NB::denne", ["dette"]],
  ["RU::один", ["одна", "одно", "одни"]],
  ["RU::день", ["днём", "днем"]],
  ["RU::среда", ["среду"]],
  ["RU::первый", ["первая", "первое", "первые"]],
  ["RU::второй", ["вторая", "второе", "вторые"]],
  ["RU::чей", ["чья", "чьё", "чье", "чьи", "чьего", "чьей", "чьему", "чью", "чьим", "чьих"]],
  ["RU::тёмный", ["тёмно", "тёмная", "тёмное", "тёмные"]],
  ["RU::запекать", ["запечь"]],
  ["RU::смешивать", ["смешать"]],
  ["RU::наливать", ["налить"]],
  ["RU::промывать", ["промыть"]],
  ["RU::остужать", ["остудить"]],
  ["RU::подавать", ["подать"]],
  ["PL::który", ["która", "które", "którzy"]],
  ["RO::câți", ["câte"]],
  ["SK::ktorý", ["ktorá", "ktoré", "ktorí"]],
  ["SK::čí", ["čia", "čie"]],
  ["SR::који", ["која", "које", "који"]],
  ["SR::чији", ["чија", "чије", "чији"]],
  ["SW::yangu", ["wangu"]],
  ["SW::yako", ["chako"]],
  ["SW::vipi", ["je"]],
  ["TA::இது", ["இந்த"]],
  ["TA::அது", ["அந்த"]],
  ["TA::இவை", ["இந்த"]],
  ["TA::அவை", ["அந்த"]],
  ["TE::ఏది", ["ఏ"]],
  ["TE::ఇది", ["ఈ"]],
  ["TE::అది", ["ఆ"]],
  ["TE::ఇవి", ["ఈ"]],
  ["TE::అవి", ["ఆ"]],
  ["TH::ทำอาหาร", ["หุง"]],
  ["TL::ikaw", ["ka"]],
  ["TR::nereden", ["nereli", "nerelisin"]],
  ["TR::insanlar", ["İnsanlar"]],
  ["ZH::这个", ["这"]],
  ["ZH::那个", ["那"]],
  ["ZH::这些", ["这"]],
  ["ZH::那些", ["那"]],
  ["ZH::多久一次", ["多久", "一次"]],
  ["LO::ແຕ່ງອາຫານ", ["ຫຸງ"]],
  ["LO::ຫັ່ນເປັນແຜ່ນ", ["ຫັ່ນ"]],
  ["LO::ເຮັດໃຫ້ແຫ້ງ", ["ເຮັດໃຫ້"]],
  ["LO::ເຮັດໃຫ້ເຢັນ", ["ເຮັດໃຫ້"]],
  ["KM::ហាន់ជាចំណិត", ["ហាន់"]],
  ["KM::ធ្វើឱ្យស្ងួត", ["ធ្វើឱ្យ"]],
  ["KM::ធ្វើឱ្យត្រជាក់", ["ធ្វើឱ្យ"]],
  ["KM::ច្របាច់ទឹកចេញ", ["ចម្រោះទឹកចេញ"]],
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  return normalizeComparable(value)
    .split(/\s+/u)
    .filter((token) => token && !articleAndFunctionWords.has(token));
}

function rowSetId(row) {
  return row.set_id ?? row.setId ?? "";
}

function rowMeaningId(row) {
  return row.meaning_id ?? row.meaningId ?? "";
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode;
}

function rowDisplay(row) {
  return normalizeText(row.display_word ?? row.displayWord ?? row.target_display_word ?? row.word_with_article_or_marker ?? row.native_word);
}

function rowExample(row) {
  return normalizeText(row.example_text ?? row.target_example);
}

function isVerbRow(row) {
  return normalizeComparable(row.part_of_speech ?? row.partOfSpeech).includes("verb");
}

function significantTokens(displayTokens) {
  if (displayTokens.length <= 1) return displayTokens;
  const filtered = displayTokens.filter((token) => !broadCompoundHeads.has(token));
  return filtered.length > 0 ? filtered : displayTokens;
}

function lexicalAnchorAliases(row) {
  const languageCode = rowLanguageCode(row);
  const normalizedDisplay = normalizeComparable(rowDisplay(row));
  const key = `${languageCode}::${normalizedDisplay}`;
  let configuredAliases = lexicalAnchorAliasesByLanguageAndDisplay.get(key) ?? null;
  if (!configuredAliases) {
    for (const [configuredKey, aliases] of lexicalAnchorAliasesByLanguageAndDisplay.entries()) {
      const separatorIndex = configuredKey.indexOf("::");
      const configuredLanguage = configuredKey.slice(0, separatorIndex);
      const configuredDisplay = configuredKey.slice(separatorIndex + 2);
      if (configuredLanguage === languageCode && normalizeComparable(configuredDisplay) === normalizedDisplay) {
        configuredAliases = aliases;
        break;
      }
    }
  }
  configuredAliases ??= [];
  if (languageCode !== "MY") return configuredAliases;

  const display = normalizeText(rowDisplay(row));
  if (!display.endsWith("ရန်")) return configuredAliases;
  const stem = display.slice(0, -"ရန်".length).trim();
  return stem ? [...configuredAliases, stem] : configuredAliases;
}

function languageSpecificTokenVariants(languageCode, displayToken) {
  const variants = new Set([displayToken]);

  if (languageCode === "LV") {
    if (displayToken.endsWith("e")) variants.add(`${displayToken.slice(0, -1)}ē`);
    if (displayToken.endsWith("a")) variants.add(`${displayToken.slice(0, -1)}ā`);
    if (displayToken.endsWith("is")) variants.add(`${displayToken.slice(0, -2)}ī`);
  }

  if (languageCode === "RO") {
    if (displayToken.endsWith("ă")) variants.add(`${displayToken.slice(0, -1)}a`);
    if (displayToken.endsWith("ă")) variants.add(`${displayToken.slice(0, -1)}ei`);
    variants.add(`${displayToken}ul`);
    variants.add(`${displayToken}ului`);
  }

  if (languageCode === "DA" || languageCode === "NB" || languageCode === "SV") {
    variants.add(`${displayToken}en`);
    variants.add(`${displayToken}et`);
    variants.add(`${displayToken}n`);
    variants.add(`${displayToken}t`);
    if (displayToken.endsWith("e")) {
      variants.add(`${displayToken.slice(0, -1)}en`);
      variants.add(`${displayToken.slice(0, -1)}et`);
      variants.add(`${displayToken.slice(0, -1)}n`);
    }
    if (languageCode === "DA" && displayToken.endsWith("en")) {
      variants.add(`${displayToken.slice(0, -2)}net`);
    }
    if (displayToken.endsWith("ffel")) variants.add(`${displayToken.slice(0, -3)}len`);
    else if (displayToken.endsWith("el")) variants.add(`${displayToken.slice(0, -2)}len`);
    const lastLetter = [...displayToken].at(-1);
    if (lastLetter) {
      variants.add(`${displayToken}${lastLetter}en`);
      variants.add(`${displayToken}${lastLetter}et`);
    }
  }

  if ((languageCode === "SR" || languageCode === "HR") && displayToken.endsWith("a")) {
    variants.add(`${displayToken.slice(0, -1)}i`);
  }

  if (languageCode === "LT" && displayToken.endsWith("is")) {
    variants.add(`${displayToken.slice(0, -2)}yje`);
  }

  if (languageCode === "RU") {
    if (displayToken.endsWith("ый") || displayToken.endsWith("ой")) {
      const stem = displayToken.slice(0, -2);
      variants.add(`${stem}ая`);
      variants.add(`${stem}ое`);
      variants.add(`${stem}ые`);
      variants.add(`${stem}ого`);
      variants.add(`${stem}ую`);
      variants.add(`${stem}ом`);
    }
    if (displayToken.endsWith("ий")) {
      const stem = displayToken.slice(0, -2);
      variants.add(`${stem}яя`);
      variants.add(`${stem}ее`);
      variants.add(`${stem}ие`);
      variants.add(`${stem}его`);
      variants.add(`${stem}юю`);
      variants.add(`${stem}ем`);
    }
  }

  return [...variants].filter(Boolean);
}

function tokenMatchesExample(displayToken, exampleTokens, languageCode) {
  return languageSpecificTokenVariants(languageCode, displayToken).some((variant) => {
    const root = variant.slice(0, Math.min(variant.length, 5));
    return exampleTokens.some((exampleToken) => {
      if (exampleToken === variant) return true;
      if (variant.length >= 5 && exampleToken.startsWith(root)) return true;
      if (exampleToken.length >= 5 && variant.startsWith(exampleToken.slice(0, 5))) return true;
      return false;
    });
  });
}

export function validateTargetExampleLexicalAnchor(row) {
  const display = rowDisplay(row);
  const example = rowExample(row);
  if (!display || !example) return [{ severity: "fail", issue: "missing display/example for lexical anchor check" }];

  const normalizedDisplay = normalizeComparable(display);
  const normalizedExample = normalizeComparable(example);
  if (normalizedDisplay && normalizedExample.includes(normalizedDisplay)) return [];
  if (lexicalAnchorAliases(row).some((alias) => normalizedExample.includes(normalizeComparable(alias)))) {
    return [];
  }

  const displayTokens = significantTokens(tokens(display));
  const exampleTokens = tokens(example);
  if (displayTokens.length === 0) return [];
  if (displayTokens.some((token) => tokenMatchesExample(token, exampleTokens, rowLanguageCode(row)))) return [];

  const severity = hardAnchorLanguages.has(rowLanguageCode(row)) && !isVerbRow(row) ? "fail" : "warning";
  return [
    {
      severity,
      issue: `target example does not visibly anchor the target display word "${display}"`,
    },
  ];
}

export function buildTargetExampleLexicalAnchorFindings(rows) {
  const blockers = [];
  const warnings = [];
  for (const row of rows) {
    for (const issue of validateTargetExampleLexicalAnchor(row)) {
      const finding = {
        ...issue,
        set_id: rowSetId(row),
        meaning_id: rowMeaningId(row),
        example_id: row.example_id,
        language_code: rowLanguageCode(row),
        display_word: rowDisplay(row),
        example_text: rowExample(row),
        affected_rows: [
          {
            set_id: rowSetId(row),
            meaning_id: rowMeaningId(row),
            example_id: row.example_id,
            language_code: rowLanguageCode(row),
          },
        ],
      };
      if (issue.severity === "fail") blockers.push(finding);
      else warnings.push(finding);
    }
  }
  return { blockers, warnings };
}

export function formatTargetExampleLexicalAnchorFinding(finding) {
  return `${finding.language_code}/${finding.meaning_id}: ${finding.issue}; display="${finding.display_word}"; example="${finding.example_text}"`;
}
