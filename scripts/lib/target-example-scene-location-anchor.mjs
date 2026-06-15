const hardAnchorLanguages = new Set(["EN", "RU", "ES", "FR", "DE"]);

const locativePrefixes = [
  "next to the ",
  "in front of the ",
  "on top of the ",
  "inside the ",
  "outside the ",
  "against the ",
  "beside the ",
  "behind the ",
  "under the ",
  "above the ",
  "near the ",
  "by the ",
  "on the ",
  "in the ",
  "at the ",
  "next to ",
  "in front of ",
  "on top of ",
  "inside ",
  "outside ",
  "against ",
  "beside ",
  "behind ",
  "under ",
  "above ",
  "near ",
  "by ",
  "on ",
  "in ",
  "at ",
];

const ignoredLocationHeads = new Set([
  "wall",
  "window",
  "door",
  "floor",
  "room",
  "bathroom",
  "kitchen",
  "line",
  "class",
  "blue",
  "heavy",
  "closed",
  "open",
  "full",
  "clean",
]);

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
  "du",
  "het",
  "een",
  "на",
  "в",
  "у",
  "с",
  "за",
  "над",
  "под",
  "рядом",
]);

const locationDisplayAliases = new Map([
  ["MY::ခုတင်", ["အိပ်ရာ"]],
  ["ID::ranjang", ["tempat tidur"]],
  ["BN::ক্লোজেট", ["আলমারি"]],
  ["TH::ตู้เก็บของ", ["ตู้เสื้อผ้า"]],
  ["IS::skápur", ["skápnum"]],
  ["ES::el cuenco", ["el bol", "bol"]],
  ["RU::день", ["днём", "днем"]],
]);

const kitchenSinkAliases = {
  DE: {
    "das waschbecken": ["das Spülbecken", "die Spüle", "Spülbecken", "Spüle"],
    "die küchenspüle": ["die Spüle", "Spüle"],
  },
  ES: {
    "el lavabo": ["el fregadero", "fregadero"],
  },
  FR: {
    "le lavabo": ["l'évier", "évier"],
  },
};

const sceneLocationAliases = {
  this: {
    BG: ["това", "този", "тази", "тези"],
    BN: ["এটা", "এই"],
    CS: ["to", "toto", "tato", "ten"],
    DA: ["denne", "dette", "det"],
    DE: ["das", "dies", "diese", "dieser", "dieses"],
    EN: ["this", "that"],
    "EN-GB": ["this", "that"],
    ES: ["este", "esta", "esto"],
    "ES-419": ["este", "esta", "esto"],
    FR: ["ce", "cet", "cette", "est ce"],
    HR: ["ovo", "ova", "ovaj"],
    JA: ["この", "これ"],
    KN: ["ಇದು", "ಈ"],
    KO: ["이것", "이"],
    LV: ["šī", "šis", "tā", "tas"],
    ML: ["ഇത്", "ഈ"],
    MY: ["ဤ", "ဒီ", "ဒါ"],
    NB: ["denne", "dette", "det"],
    NL: ["deze", "dit"],
    PL: ["ta", "to", "ten"],
    "PT-BR": ["este", "esta", "isto"],
    RO: ["acest", "această", "acesta", "aceasta"],
    RU: ["это", "этот", "эта", "эти"],
    SK: ["táto", "toto", "tento"],
    SL: ["ta", "to"],
    SR: ["ova", "ово", "ова", "овај"],
    SW: ["hii", "huu"],
    TA: ["இது", "இந்த"],
    TE: ["ఇది", "ఈ"],
    VI: ["này", "đây"],
    ZH: ["这个", "这"],
  },
  sink: {
    AZ: ["lavabo", "lavabonun", "çanaq", "çanağın"],
    CS: ["dřez", "dřezu", "dřezem"],
    DA: ["vask", "vasken"],
    DE: ["waschbecken", "spülbecken", "spüle"],
    ES: ["lavabo", "fregadero"],
    "ES-419": ["fregadero", "lavabo"],
    ET: ["valamu", "kraanikauss", "kraanikausi"],
    FI: ["allas", "altaan", "altaassa"],
    FR: ["lavabo", "évier"],
    HR: ["sudoper", "sudopera", "sudoperu"],
    HU: ["mosogató", "mosogató alatt", "mosogató mellett"],
    ID: ["bak cuci", "wastafel"],
    IS: ["vask", "vaskinn", "vaskinum"],
    IT: ["lavello", "lavandino"],
    JA: ["シンク"],
    KK: ["раковина", "раковинаның"],
    KM: ["លិច", "អាងលាងចាន"],
    KO: ["싱크대"],
    LO: ["ອ່າງ", "ອ່າງລ້າງ", "ຊິງ"],
    LT: ["kriauklė", "kriauklės", "kriaukle"],
    NB: ["vask", "vasken"],
    NL: ["gootsteen"],
    PL: ["zlew", "zlewem", "zlewu"],
    PT: ["lava-louça", "lava-loiça", "lava loiça", "lavalouça", "lavatório"],
    SK: ["drez", "drezu", "drezom"],
    SL: ["korito", "korita", "koritu", "koritom"],
    SR: ["sudopera", "sudopere", "sudoperi", "sudoperu"],
    SV: ["diskho", "diskhon"],
    ZH: ["水槽"],
  },
  counter: {
    DE: ["Tresen", "Theke", "der Tresen", "die Theke"],
    ES: ["barra", "la barra", "mostrador", "el mostrador"],
  },
  bar: {
    ES: ["bar", "un bar", "barra", "la barra"],
  },
  menu: {
    DE: ["Karte", "Getränkekarte", "die Getränkekarte"],
    ES: ["carta", "la carta", "menú", "el menú"],
    "ES-419": ["carta", "la carta", "menú", "el menú"],
    FR: ["carte", "la carte", "menu", "un menu"],
    HY: ["մենյու", "մենյուն", "ճաշացանկ", "ճաշացանկում"],
    KO: ["메뉴", "메뉴판"],
    LO: ["ເມນູ", "ເມນູໜຶ່ງ"],
    SK: ["jedálny lístok", "ponuka", "ponuke"],
  },
  list: {
    RU: ["список", "карта", "карте"],
  },
  closet: {
    AZ: ["divar dolabı", "şkaf", "şkafdadır"],
    BG: ["вграден гардероб", "шкаф", "гардероб"],
    DE: ["schrank", "wandschrank"],
    "ES-419": ["armario empotrado", "clóset", "closet"],
    FI: ["komero", "kaappi", "kaapissa"],
    ET: ["sisseehitatud kapp", "kapp", "kapis"],
    KK: ["кіріктірілген шкаф", "шкаф", "шкафта"],
    SI: ["කබඩ්", "අල්මාරිය", "අල්මාරියේ"],
    SV: ["klädkammare", "garderob", "garderoben"],
    ZH: ["壁橱", "衣柜"],
  },
  cabinet: {
    "EN-GB": ["cabinet", "cupboard"],
    FR: ["armoire", "placard"],
    KO: ["캐비닛", "수납장"],
  },
  bowl: {
    AZ: ["kasa", "kasə", "kasənin"],
    CS: ["miska", "misce", "misky"],
    DE: ["schüssel", "schale"],
    ET: ["kauss", "kausi"],
    HU: ["tál", "tálban"],
    KA: ["თასი", "თასში", "თასშია", "ჯამი"],
    KM: ["ចានគោម", "ចានធំ"],
    LT: ["dubuo", "dubens", "dubenyje"],
    PL: ["miska", "misce"],
    RU: ["миска", "чаша", "чаше", "чашу"],
    SK: ["misa", "miske", "misky"],
  },
  drawer: {
    ET: ["sahtel", "sahtlis"],
    NL: ["lade", "la"],
    SR: ["fioka", "fioci", "фиока", "фиоци"],
    TA: ["இழுப்பறை", "டிராயர்"],
    TL: ["dibuhista", "drawer"],
  },
  hanger: {
    SI: ["ඇඳුම් එල්ලනය", "හැන්ගරය", "හැන්ගරයේ"],
  },
  table: {
    CS: ["stůl", "stolu", "stole"],
    ET: ["laud", "laua"],
    FI: ["pöytä", "pöydän", "pöydässä", "pöydällä"],
    KO: ["탁자", "식탁"],
    LT: ["stalas", "stalo"],
    PL: ["stół", "stole"],
    SK: ["stôl", "stole"],
    SR: ["сто", "stol", "stola", "stolu"],
    TE: ["మేజా", "బల్ల"],
    ZH: ["桌子", "桌边", "桌上"],
  },
  bed: {
    HY: ["մահճակալ", "անկողնում", "մահճակալի"],
    KK: ["кереует", "төсек", "төсекте"],
    LT: ["lova", "lovoje"],
  },
  desk: {
    HR: ["radni stol", "radnog stola", "radnom stolu"],
  },
  shower: {
    CS: ["sprcha", "sprše"],
    RO: ["duș", "dușul"],
  },
  shelf: {
    BG: ["рафтът", "рафт", "лавица"],
    ES: ["estante", "repisa"],
    "ES-419": ["estante", "repisa"],
    IS: ["hilla", "hillunni"],
    IT: ["la mensola", "mensola", "scaffale", "sullo scaffale"],
    LO: ["ຊັ້ນວາງ", "ຊັ້ນ"],
    NE: ["तख्ता", "र्‍याक", "र्याक"],
    PL: ["półka", "półce"],
    SR: ["полица", "polica", "polici"],
    TL: ["estante", "istante"],
  },
  "laundry detergent": {
    JA: ["洗濯用洗剤", "洗剤"],
  },
  bathtub: {
    CS: ["vana", "vaně", "vany"],
    RO: ["cadă", "cada"],
    SK: ["vaňa", "vane"],
  },
  cup: {
    AZ: ["fincan", "fincanın", "stəkan", "stəkanın"],
    CS: ["šálek", "hrnek", "hrnku"],
    DA: ["kop", "koppen"],
    DE: ["tasse", "becher"],
    ES: ["taza", "vaso"],
    "ES-419": ["taza", "vaso"],
    ET: ["tass", "tops", "topsis"],
    FI: ["kuppi", "kupin", "kupissa"],
    FR: ["tasse", "pot", "gobelet"],
    HU: ["csésze", "pohár", "pohárban"],
    IT: ["tazza", "bicchiere"],
    KA: ["ჭიქა", "ჭიქის"],
    KM: ["ពែង", "កែវ"],
    LV: ["tasīte", "krūze", "krūzē"],
    NL: ["kopje", "beker"],
    PL: ["filiżanka", "kubek", "kubku"],
    PT: ["chávena", "copo"],
    "PT-BR": ["xícara", "copo"],
    RO: ["ceașcă", "cană"],
    RU: ["чашка", "стакан"],
    SK: ["šálka", "pohár", "pohári"],
    SL: ["skodelica", "lonček", "lončku"],
    SR: ["šolja", "šolje", "чаша", "чаши"],
    TH: ["ถ้วย", "แก้ว"],
    TR: ["fincan", "bardak", "bardakta"],
    UZ: ["piyola", "stakan"],
  },
  bag: {
    DE: ["tasche", "tüte", "tuete"],
    RU: ["сумка", "пакет", "пакете"],
  },
  mouse: {
    SL: ["miška", "miško"],
  },
  notebook: {
    SL: ["zvezek", "zvezku", "zvezka"],
    SR: ["свеска", "свесци"],
  },
  monitor: {
    FI: ["näyttö", "näytön", "näytössä"],
    IS: ["skjár", "skjánum", "skjáinn", "skjásins"],
  },
  plate: {
    IS: ["diskur", "diskinn", "diskinum"],
    KA: ["თეფში", "თეფშზე", "თეფშში", "თეფშთან"],
    LV: ["šķīvis", "šķīvja", "šķīvī"],
    UZ: ["tarelka", "likopcha", "likopcha yonida"],
  },
  glass: {
    BG: ["стъклена чаша", "чаша", "чашата"],
    DA: ["et glas", "glas", "glasset"],
    ES: ["copa", "la copa", "vaso", "el vaso"],
    "ES-419": ["copa", "la copa", "vaso", "el vaso"],
    KA: ["ჭიქა", "ჭიქის"],
    KO: ["유리컵", "유리잔", "컵"],
    RU: ["стакан", "стакане", "бокал", "бокале"],
    TA: ["டம்ளர்", "கண்ணாடிக் கோப்பை"],
  },
  pitcher: {
    "EN-GB": ["pitcher", "the pitcher", "jug", "a jug"],
    KK: ["құман", "құмыра", "құмырада"],
  },
  jar: {
    DE: ["glas", "vorratsglas"],
    ES: ["tarro", "frasco"],
  },
  poster: {
    ES: ["póster", "poster", "cartel"],
  },
  stand: {
    DE: ["stand", "ständer", "schirmständer", "tisch"],
    ES: ["soporte", "mueble", "paragüero"],
    FR: ["support", "meuble", "porte parapluies", "porte-parapluies"],
    RU: ["стойка", "подставка", "подставке", "подставк", "тумба", "тумбе"],
  },
  picture: {
    DE: ["bild", "foto", "abbildung"],
    ES: ["imagen", "foto", "dibujo"],
    FR: ["image", "photo"],
    RU: ["картинка", "картинкой", "изображение", "изображением", "фотография", "фотографией"],
  },
  easy: {
    DE: ["leicht", "einfach"],
  },
  folder: {
    DE: ["mappe", "ordner"],
  },
  warm: {
    ES: ["templado", "tibio", "tibia"],
  },
  sofa: {
    KA: ["დივანი", "დივნის"],
    PL: ["sofa", "sofy", "sofie", "sofą"],
  },
  fork: {
    DA: ["gaffel", "gaflen"],
    KA: ["ჩანგალი", "ჩანგლის", "ჩანგალთან"],
  },
  tray: {
    AZ: ["sini", "qab", "qabın"],
    BG: ["поднос", "табла", "таблата"],
    DE: ["tablett", "ablage"],
    ET: ["kandik", "alus", "alusel"],
    FI: ["tarjotin", "lokerossa", "lokero"],
    HR: ["pladanj", "poslužavnik", "poslužavniku"],
    HU: ["tálca", "tálcán"],
    ID: ["nampan", "baki"],
    JA: ["トレイ", "トレー"],
    LT: ["padėklas", "dėklas", "dėkle", "dėklo"],
    NL: ["dienblad", "bak"],
    PL: ["taca", "tacy"],
    RU: ["поднос", "лоток", "лотке"],
    SL: ["pladenj", "pladnju"],
    SR: ["poslužavnik", "послужавник", "послужавнику"],
    SV: ["bricka", "fack", "facket"],
    SW: ["sinia", "trei"],
  },
  pot: {
    CS: ["hrnec", "hrnci"],
    DE: ["topf", "kanne"],
    ES: ["olla", "cafetera"],
    ET: ["pott", "poti"],
    FR: ["marmite", "cafetière", "cafetiere"],
    IS: ["pottur", "pottinum"],
    KA: ["ქვაბი", "ქვაბზე", "ქვაბშია"],
    LT: ["puodas", "puodo", "puode"],
    LV: ["katls", "katla"],
    NL: ["de kookpan", "kookpan", "pan"],
    RU: ["кастрюля", "кофейник", "кофейнике"],
    SK: ["hrniec", "hrnci"],
    SL: ["lonec", "loncu"],
    SV: ["en gryta", "gryta", "kastrull", "kastrullen"],
  },
  pan: {
    CS: ["pánev", "pánvi"],
    IS: ["panna", "pönnunni"],
    JA: ["浅鍋", "フライパン"],
  },
  broom: {
    ET: ["luud", "luua"],
    FI: ["luuta", "luudan"],
    IS: ["kústur", "kústinn"],
  },
  "kitchen sink": {
    JA: ["台所のシンク", "シンク"],
  },
  building: {
    FR: ["bâtiment", "immeuble"],
  },
  elevator: {
    IS: ["lyfta", "lyftunni"],
    KA: ["ლიფტი", "ლიფტთან"],
  },
  house: {
    CS: ["dům", "domem", "domu"],
    HY: ["տուն", "տան"],
    LO: ["ເຮືອນ", "ບ້ານ", "ເຮືອນຢູ່", "ບ້ານຢູ່"],
    RO: ["casă", "casa", "casei"],
    SL: ["hiša", "hišo", "hiši", "hiše"],
    TE: ["ఇల్లు", "ఇంటి"],
  },
  fence: {
    ET: ["aed", "aia"],
    FI: ["aita", "aidan"],
    JA: ["柵", "フェンス"],
  },
  rake: {
    CS: ["hrábě", "hrábí"],
  },
  shed: {
    DE: ["schuppen", "gartenschuppen"],
    SL: ["lopa", "lopo", "lopi"],
  },
  patio: {
    ES: ["patio", "terraza"],
    FR: ["patio", "terrasse"],
    IS: ["pallur", "verönd", "veröndinni"],
    KK: ["терраса", "патио", "патиода"],
    RU: ["патио", "терраса", "террасе"],
  },
};

function parseScene(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

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

function stripEnglishArticle(value) {
  return normalizeComparable(value).replace(/^(the|a|an)\s+/u, "").trim();
}

export function inferSceneLocationCanonical(row) {
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  if (scene.scene_role === "basic_verb") return null;
  const location = stripEnglishArticle(scene.state_or_location);
  if (!location) return null;
  if (!/[a-z]/u.test(location)) return null;
  if (ignoredLocationHeads.has(location) || location === "closed" || location === "open" || location === "full" || location === "clean") return null;

  for (const prefix of locativePrefixes) {
    if (location.startsWith(prefix)) {
      const locationCanonical = stripEnglishArticle(location.slice(prefix.length));
      if (!locationCanonical) return null;
      if (ignoredLocationHeads.has(locationCanonical)) return null;
      return locationCanonical;
    }
  }
  return null;
}

function tokens(value) {
  return normalizeComparable(value)
    .split(/\s+/u)
    .filter((token) => token && !articleAndFunctionWords.has(token));
}

function foldLatinDiacritics(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Mark}+/gu, "")
    .normalize("NFC");
}

function languageSpecificTokenVariants(languageCode, displayToken) {
  const variants = new Set([displayToken]);

  if (["DA", "NB", "SV"].includes(languageCode)) {
    variants.add(`${displayToken}en`);
    variants.add(`${displayToken}et`);
    variants.add(`${displayToken}n`);
    variants.add(`${displayToken}t`);
    if (displayToken.endsWith("e")) {
      variants.add(`${displayToken.slice(0, -1)}en`);
      variants.add(`${displayToken.slice(0, -1)}et`);
    }
  }

  if (languageCode === "LV") {
    if (displayToken.endsWith("a")) variants.add(`${displayToken.slice(0, -1)}ā`);
    if (displayToken.endsWith("e")) variants.add(`${displayToken.slice(0, -1)}ē`);
    if (displayToken.endsWith("s")) variants.add(`${displayToken.slice(0, -1)}ā`);
  }

  if (languageCode === "LT" && displayToken.endsWith("is")) {
    variants.add(`${displayToken.slice(0, -2)}yje`);
  }
  if (languageCode === "LT" && displayToken.endsWith("a")) {
    variants.add(`${displayToken.slice(0, -1)}os`);
  }

  if (languageCode === "FI") {
    if (displayToken.endsWith("ky")) {
      variants.add(`${displayToken.slice(0, -2)}gyllä`);
      variants.add(`${displayToken.slice(0, -2)}gyn`);
    }
    variants.add(`${displayToken}llä`);
    variants.add(`${displayToken}n`);
  }

  if (languageCode === "PL") {
    if (displayToken.endsWith("ko")) variants.add(`${displayToken.slice(0, -1)}u`);
    if (displayToken.endsWith("o")) variants.add(`${displayToken.slice(0, -1)}u`);
    if (displayToken.length >= 4) variants.add(displayToken.slice(0, 4));
  }

  if (languageCode === "ET" && displayToken.endsWith("i")) {
    variants.add(`${displayToken.slice(0, -1)}ja`);
  }
  if (languageCode === "ET") {
    if (displayToken.endsWith("ss")) variants.add(`${displayToken.slice(0, -2)}si`);
    if (displayToken.endsWith("s")) variants.add(`${displayToken}i`);
    if (displayToken.endsWith("el")) variants.add(`${displayToken.slice(0, -2)}lis`);
  }

  if (languageCode === "IS" && displayToken.endsWith("i")) {
    variants.add(`${displayToken.slice(0, -1)}ann`);
  }

  if (["CS", "SK"].includes(languageCode)) {
    if (displayToken.endsWith("ka")) {
      variants.add(`${displayToken.slice(0, -2)}ce`);
      variants.add(`${displayToken.slice(0, -1)}y`);
    }
    if (displayToken.endsWith("cha")) variants.add(`${displayToken.slice(0, -3)}še`);
    if (displayToken.endsWith("a")) {
      variants.add(`${displayToken.slice(0, -1)}y`);
      variants.add(`${displayToken.slice(0, -1)}ě`);
      variants.add(`${displayToken.slice(0, -1)}e`);
    }
    if (displayToken.endsWith("ec")) variants.add(`${displayToken.slice(0, -2)}ce`);
  }

  if (["HR", "SR", "SL"].includes(languageCode)) {
    if (displayToken.endsWith("a")) {
      variants.add(`${displayToken.slice(0, -1)}i`);
      variants.add(`${displayToken.slice(0, -1)}e`);
    }
    if (displayToken.endsWith("ac")) variants.add(`${displayToken.slice(0, -2)}cu`);
    if (displayToken.endsWith("anj")) variants.add(`${displayToken.slice(0, -3)}nju`);
    if (displayToken.endsWith("ev")) variants.add(`${displayToken.slice(0, -2)}vi`);
  }

  if (languageCode === "RO") {
    if (displayToken.endsWith("ul")) variants.add(displayToken.slice(0, -2));
    if (displayToken.endsWith("a")) variants.add(`${displayToken.slice(0, -1)}ă`);
    if (displayToken.endsWith("ă")) variants.add(`${displayToken.slice(0, -1)}a`);
  }

  if (languageCode === "AZ") {
    variants.add(`${displayToken}nın`);
    variants.add(`${displayToken}nin`);
    variants.add(`${displayToken}nun`);
    variants.add(`${displayToken}nün`);
    if (displayToken.endsWith("a") || displayToken.endsWith("ə")) variants.add(`${displayToken}nin`);
  }

  if (["RO", "IT", "PT", "ES", "FR"].includes(languageCode) && displayToken.length >= 4) {
    variants.add(displayToken.replace(/[aeiouăâîáéíóúàèìòù]$/u, ""));
  }

  if (languageCode === "ES" && displayToken.endsWith("o")) {
    const stem = displayToken.slice(0, -1);
    variants.add(`${stem}a`);
    variants.add(`${stem}os`);
    variants.add(`${stem}as`);
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
  const comparableExampleTokens = new Set([
    ...exampleTokens,
    ...exampleTokens.map((token) => foldLatinDiacritics(token)),
  ]);
  return languageSpecificTokenVariants(languageCode, displayToken).some((variant) => {
    if (!variant) return false;
    const comparableVariants = [variant, foldLatinDiacritics(variant)];
    return comparableVariants.some((comparableVariant) => [...comparableExampleTokens].some((exampleToken) => {
      if (!comparableVariant) return false;
      if (exampleToken === variant) return true;
      if (exampleToken === comparableVariant) return true;
      if (languageCode === "RU" && comparableVariant.length >= 4 && exampleToken.startsWith(comparableVariant.slice(0, 4))) {
        return true;
      }
      if (["PL", "RO"].includes(languageCode) && comparableVariant.length >= 4 && exampleToken.startsWith(comparableVariant.slice(0, 4))) {
        return true;
      }
      if (languageCode === "TR" && comparableVariant.length >= 5 && exampleToken.startsWith(comparableVariant.slice(0, 4))) {
        return true;
      }
      if (comparableVariant.length >= 5 && exampleToken.startsWith(comparableVariant.slice(0, 5))) return true;
      if (exampleToken.length >= 5 && comparableVariant.startsWith(exampleToken.slice(0, 5))) return true;
      return false;
    }));
  });
}

function kitchenContextAliases(row, languageCode, normalizedDisplay) {
  const setId = row.set_id ?? row.setId ?? "";
  if (!String(setId).startsWith("home_kitchen_")) return [];
  return kitchenSinkAliases[languageCode]?.[normalizedDisplay] ?? [];
}

function sceneLocationContextAliases(row, languageCode) {
  const locationCanonical = normalizeComparable(
    row.location_canonical_english ?? row.locationCanonicalEnglish ?? inferSceneLocationCanonical(row)
  );
  return sceneLocationAliases[locationCanonical]?.[languageCode] ?? [];
}

function displayAppearsInExample(row, display, example, languageCode) {
  const normalizedDisplay = normalizeComparable(display);
  const normalizedExample = normalizeComparable(example);
  if (!normalizedDisplay || !normalizedExample) return false;
  if (normalizedExample.includes(normalizedDisplay)) return true;
  const aliases = [
    ...(locationDisplayAliases.get(`${languageCode}::${display}`) ?? []),
    ...kitchenContextAliases(row, languageCode, normalizedDisplay),
    ...sceneLocationContextAliases(row, languageCode),
  ];
  if (aliases.some((alias) => normalizedExample.includes(normalizeComparable(alias)))) return true;

  const displayTokens = tokens(display);
  const exampleTokens = tokens(example);
  if (displayTokens.length === 0 || exampleTokens.length === 0) return false;
  return displayTokens.some((token) => tokenMatchesExample(token, exampleTokens, languageCode));
}

function rowLanguageCode(row) {
  return row.language_code ?? row.languageCode ?? "";
}

export function validateTargetExampleSceneLocationAnchor(row) {
  const locationCanonical = normalizeComparable(
    row.location_canonical_english ?? row.locationCanonicalEnglish ?? inferSceneLocationCanonical(row)
  );
  if (!locationCanonical) return [];
  if (ignoredLocationHeads.has(locationCanonical)) return [];

  const locationDisplay = normalizeText(
    row.location_display_word ?? row.locationDisplayWord ?? row.location_native_word ?? row.locationNativeWord
  );
  if (!locationDisplay) return [];

  const example = normalizeText(row.example_text ?? row.target_example);
  if (!example) {
    return [{ severity: "fail", issue: `target example is missing for scene location "${locationCanonical}"` }];
  }

  const languageCode = rowLanguageCode(row);
  if (displayAppearsInExample(row, locationDisplay, example, languageCode)) return [];

  const severity = hardAnchorLanguages.has(languageCode) ? "fail" : "warning";
  return [
    {
      severity,
      issue: `target example does not visibly preserve scene location "${locationCanonical}" via "${locationDisplay}"`,
    },
  ];
}

export function buildTargetExampleSceneLocationAnchorFindings(rows) {
  const blockers = [];
  const warnings = [];
  let checked = 0;
  let skipped = 0;

  for (const row of rows) {
    const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
    if (scene.scene_role === "basic_verb") {
      skipped += 1;
      continue;
    }
    const locationCanonical = normalizeComparable(
      row.location_canonical_english ?? row.locationCanonicalEnglish ?? inferSceneLocationCanonical(row)
    );
    const locationDisplay = normalizeText(
      row.location_display_word ?? row.locationDisplayWord ?? row.location_native_word ?? row.locationNativeWord
    );
    if (!locationCanonical || ignoredLocationHeads.has(locationCanonical) || !locationDisplay) {
      skipped += 1;
      continue;
    }
    checked += 1;

    for (const issue of validateTargetExampleSceneLocationAnchor(row)) {
      const finding = {
        ...issue,
        set_id: row.set_id ?? row.setId ?? "",
        display_order: row.display_order ?? row.displayOrder ?? null,
        meaning_id: row.meaning_id ?? row.meaningId ?? "",
        example_id: row.example_id ?? row.exampleId ?? "",
        language_code: rowLanguageCode(row),
        location_canonical_english: locationCanonical,
        location_display_word: locationDisplay,
        example_text: normalizeText(row.example_text ?? row.target_example),
      };
      if (issue.severity === "fail") blockers.push(finding);
      else warnings.push(finding);
    }
  }

  return { blockers, warnings, checked, skipped };
}

export function formatTargetExampleSceneLocationAnchorFinding(finding) {
  return `${finding.language_code}/${finding.meaning_id}: ${finding.issue}; example="${finding.example_text}"`;
}
