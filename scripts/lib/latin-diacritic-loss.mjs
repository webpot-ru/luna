const spanishRules = {
  labels: ["Spanish"],
  patterns: [
    { pattern: /\bbascula\b/iu, expected: "báscula" },
    { pattern: /\btermometro\b/iu, expected: "termómetro" },
    { pattern: /\bcitricos\b/iu, expected: "cítricos" },
    { pattern: /\breposteria\b/iu, expected: "repostería" },
    { pattern: /\bcapsulas\b/iu, expected: "cápsulas" },
    { pattern: /\bestamena\b/iu, expected: "estameña" },
    { pattern: /\btazon\b/iu, expected: "tazón" },
    { pattern: /\bcajon\b/iu, expected: "cajón" },
    {
      pattern:
        /\besta\b(?=\s+(?:en|sobre|junto|cerca|debajo|encima|dentro|fuera|abiert[oa]s?|cerrad[oa]s?|limpi[oa]s?|vac[ií][oa]s?|llen[oa]s?|list[oa]s?|aqu[ií]|ah[ií]|all[ií])\b)/iu,
      expected: "está",
    },
    { pattern: /\bestan\b/iu, expected: "están" },
  ],
};

const czechRules = {
  labels: ["Czech"],
  patterns: [
    { pattern: /\bkuchynska\b/iu, expected: "kuchyňská" },
    { pattern: /\bkuchynsky\b/iu, expected: "kuchyňský" },
    { pattern: /\bkuchynske\b/iu, expected: "kuchyňské" },
    { pattern: /\bvaha\b/iu, expected: "váha" },
    { pattern: /\bcasovac\b/iu, expected: "časovač" },
    { pattern: /\bteplomer\b/iu, expected: "teploměr" },
    { pattern: /\btrychtyr\b/iu, expected: "trychtýř" },
    { pattern: /\bcesnek\b/iu, expected: "česnek" },
    { pattern: /\bstouchadlo\b/iu, expected: "šťouchadlo" },
    { pattern: /\bkrajec\b/iu, expected: "kráječ" },
    { pattern: /\bnuzky\b/iu, expected: "nůžky" },
    { pattern: /\bcukrarsky\b/iu, expected: "cukrářský" },
    { pattern: /\bstetec\b/iu, expected: "štětec" },
    { pattern: /\bchladici\b/iu, expected: "chladicí" },
    { pattern: /\bmrizka\b/iu, expected: "mřížka" },
    { pattern: /\bpodlozka\b/iu, expected: "podložka" },
    { pattern: /\botvirak\b/iu, expected: "otvírák" },
    { pattern: /\btvoritko\b/iu, expected: "tvořítko" },
    { pattern: /\bskrabka\b/iu, expected: "škrabka" },
    { pattern: /\btesto\b/iu, expected: "těsto" },
    { pattern: /\bsitko\b/iu, expected: "sítko" },
    { pattern: /\bpecici\b/iu, expected: "pečicí" },
    { pattern: /\bkosicky\b/iu, expected: "košíčky" },
    { pattern: /\bparatka\b/iu, expected: "párátka" },
    { pattern: /\bdrevene\b/iu, expected: "dřevěné" },
    { pattern: /\bspizy\b/iu, expected: "špízy" },
    { pattern: /\bprovazek\b/iu, expected: "provázek" },
    { pattern: /\bsyrovarske\b/iu, expected: "sýrařské" },
    { pattern: /\bsacek\b/iu, expected: "sáček" },
    { pattern: /\bzasuvce\b/iu, expected: "zásuvce" },
  ],
};

const slovakRules = {
  labels: ["Slovak"],
  patterns: [
    { pattern: /\bkuchynska\b/iu, expected: "kuchynská" },
    { pattern: /\bkuchynsky\b/iu, expected: "kuchynský" },
    { pattern: /\bkuchynske\b/iu, expected: "kuchynské" },
    { pattern: /\bvaha\b/iu, expected: "váha" },
    { pattern: /\bcasovac\b/iu, expected: "časovač" },
    { pattern: /\bvedla\b/iu, expected: "vedľa" },
    { pattern: /\btlacidlo\s+na\s+zemiaky\b/iu, expected: "pučidlo na zemiaky" },
    { pattern: /\bkrajac\b/iu, expected: "krájač" },
    { pattern: /\bnoznice\b/iu, expected: "nožnice" },
    { pattern: /\bcukrarsky\b/iu, expected: "cukrársky" },
    { pattern: /\bcukrarske\b/iu, expected: "cukrárske" },
    { pattern: /\bstetec\b/iu, expected: "štetec" },
    { pattern: /\bmriezka\b/iu, expected: "mriežka" },
    { pattern: /\bpodlozka\b/iu, expected: "podložka" },
    { pattern: /\botvarac\b/iu, expected: "otvárač" },
    { pattern: /\blad\b/iu, expected: "ľad" },
    { pattern: /\bskrabka\b/iu, expected: "škrabka" },
    { pattern: /\bmuku\b/iu, expected: "múku" },
    { pattern: /\bpecenie\b/iu, expected: "pečenie" },
    { pattern: /\bkosicky\b/iu, expected: "košíčky" },
    { pattern: /\bsparadla\b/iu, expected: "špáradlá" },
    { pattern: /\bdrevene\b/iu, expected: "drevené" },
    { pattern: /\bspizy\b/iu, expected: "špízy" },
    { pattern: /\bspagat\b/iu, expected: "špagát" },
    { pattern: /\bsyrovarske\b/iu, expected: "syrárske" },
    { pattern: /\bzasuvke\b/iu, expected: "zásuvke" },
    { pattern: /(?<![\p{L}\p{M}])su(?![\p{L}\p{M}])/iu, expected: "sú" },
  ],
};

const hungarianRules = {
  labels: ["Hungarian"],
  patterns: [
    { pattern: /\bmerleg\b/iu, expected: "mérleg" },
    { pattern: /\bidozito\b/iu, expected: "időzítő" },
    { pattern: /\bhomero\b/iu, expected: "hőmérő" },
    { pattern: /\btolcser\b/iu, expected: "tölcsér" },
    { pattern: /\bfokhagymapres\b/iu, expected: "fokhagymaprés" },
    { pattern: /\bcitrusfacsaro\b/iu, expected: "citrusfacsaró" },
    { pattern: /\bkrumplinyomo\b/iu, expected: "krumplinyomó" },
    { pattern: /\bpizzavag\b/iu, expected: "pizzavágó" },
    { pattern: /\bollo\b/iu, expected: "olló" },
    { pattern: /\bcukraszecset\b/iu, expected: "cukrászecset" },
    { pattern: /\bhutoracs\b/iu, expected: "hűtőrács" },
    { pattern: /\bedenyalatet\b/iu, expected: "edényalátét" },
    { pattern: /\buvegnyito\b/iu, expected: "üvegnyitó" },
    { pattern: /\bjegkockatarto\b/iu, expected: "jégkockatartó" },
    { pattern: /\btesztakapar\b/iu, expected: "tésztakaparó" },
    { pattern: /\bsutopapir\b/iu, expected: "sütőpapír" },
    { pattern: /\bsutokosarak\b/iu, expected: "sütőkosarak" },
    { pattern: /\bfogpiszkalok\b/iu, expected: "fogpiszkálók" },
    { pattern: /\bnyarsak\b/iu, expected: "nyársak" },
    { pattern: /\bsajtkendo\b/iu, expected: "sajtkendő" },
    { pattern: /\bhabzsak\b/iu, expected: "habzsák" },
    { pattern: /\bfiokban\b/iu, expected: "fiókban" },
    { pattern: /(?<![\p{L}\p{M}])tal(?![\p{L}\p{M}])/iu, expected: "tál" },
  ],
};

const romanianRules = {
  labels: ["Romanian"],
  patterns: [
    { pattern: /\bcantar\b/iu, expected: "cântar" },
    { pattern: /\bbucatarie\b/iu, expected: "bucătărie" },
    { pattern: /\bin sertar\b/iu, expected: "în sertar" },
    { pattern: /\blanga\b/iu, expected: "lângă" },
    { pattern: /\bstorcator\b/iu, expected: "storcător" },
    { pattern: /\btaietor\b/iu, expected: "tăietor" },
    { pattern: /\bfoarfeca\b/iu, expected: "foarfecă", fields: ["native_word", "display_word", "word_with_article_or_marker", "transcription"] },
    { pattern: /\bpensula\b/iu, expected: "pensulă", fields: ["native_word", "display_word", "word_with_article_or_marker", "transcription"] },
    { pattern: /\bgratar\b/iu, expected: "grătar" },
    { pattern: /\bracire\b/iu, expected: "răcire" },
    { pattern: /\boala\b/iu, expected: "oală", fields: ["native_word", "display_word", "word_with_article_or_marker", "transcription"] },
    { pattern: /\bdeschizator\b/iu, expected: "deschizător" },
    { pattern: /\bgheata\b/iu, expected: "gheață" },
    { pattern: /\bracleta\b/iu, expected: "racletă", fields: ["native_word", "display_word", "word_with_article_or_marker", "transcription"] },
    { pattern: /\bfaina\b/iu, expected: "făină" },
    { pattern: /\bhartie\b/iu, expected: "hârtie" },
    { pattern: /\bfrigarui\b/iu, expected: "frigărui" },
    { pattern: /\bsfoara\b/iu, expected: "sfoară", fields: ["native_word", "display_word", "word_with_article_or_marker", "transcription"] },
    { pattern: /\bpos\b/iu, expected: "poș" },
  ],
};

const croatianRules = {
  labels: ["Croatian"],
  patterns: [
    { pattern: /\bcesnjak\b/iu, expected: "češnjak" },
    { pattern: /\brezac\b/iu, expected: "rezač" },
    { pattern: /\bskare\b/iu, expected: "škare" },
    { pattern: /\bslasticarska\b/iu, expected: "slastičarska" },
    { pattern: /\bcetkica\b/iu, expected: "četkica" },
    { pattern: /\bresetka\b/iu, expected: "rešetka" },
    { pattern: /\bhladenje\b/iu, expected: "hlađenje" },
    { pattern: /\bpodmetac\b/iu, expected: "podmetač" },
    { pattern: /\botvarac\b/iu, expected: "otvarač" },
    { pattern: /\bbrasno\b/iu, expected: "brašno" },
    { pattern: /\bpecenje\b/iu, expected: "pečenje" },
    { pattern: /\bcackalice\b/iu, expected: "čačkalice" },
    { pattern: /\braznjici\b/iu, expected: "ražnjići" },
    { pattern: /\bvrecica\b/iu, expected: "vrećica" },
  ],
};

const serbianRules = {
  labels: ["Serbian Latin"],
  patterns: [
    { pattern: /\bploci\b/iu, expected: "ploči" },
    { pattern: /\bcinije\b/iu, expected: "činije" },
    { pattern: /\bsekac\b/iu, expected: "sekač" },
    { pattern: /\bposlasticarska\b/iu, expected: "poslastičarska" },
    { pattern: /\bcetkica\b/iu, expected: "četkica" },
    { pattern: /\bresetka\b/iu, expected: "rešetka" },
    { pattern: /\bhladenje\b/iu, expected: "hlađenje" },
    { pattern: /\bpodmetac\b/iu, expected: "podmetač" },
    { pattern: /\bserpu\b/iu, expected: "šerpu" },
    { pattern: /\botvarac\b/iu, expected: "otvarač" },
    { pattern: /\bstrugac\b/iu, expected: "strugač" },
    { pattern: /\bbrasno\b/iu, expected: "brašno" },
    { pattern: /\bpecenje\b/iu, expected: "pečenje" },
    { pattern: /\bcackalice\b/iu, expected: "čačkalice" },
    { pattern: /\braznjici\b/iu, expected: "ražnjići" },
  ],
};

const lithuanianRules = {
  labels: ["Lithuanian"],
  patterns: [
    { pattern: /\bvirtuvines\b/iu, expected: "virtuvinės" },
    { pattern: /\bsvarstykles\b/iu, expected: "svarstyklės" },
    { pattern: /\bstalvirsio\b/iu, expected: "stalviršio" },
    { pattern: /\bstalciuje\b/iu, expected: "stalčiuje" },
    { pattern: /\bsalia\b/iu, expected: "šalia" },
    { pattern: /\bcesnaku\b/iu, expected: "česnakų" },
    { pattern: /\bspaudykle\b/iu, expected: "spaudyklė" },
    { pattern: /\bcitrusiniu\b/iu, expected: "citrusinių" },
    { pattern: /\bvaisiu\b/iu, expected: "vaisių" },
    { pattern: /\bbulviu\b/iu, expected: "bulvių" },
    { pattern: /\bgrustuve\b/iu, expected: "grūstuvė" },
    { pattern: /\bpjaustykle\b/iu, expected: "pjaustyklė" },
    { pattern: /\bzirkles\b/iu, expected: "žirklės" },
    { pattern: /\bvesinimo\b/iu, expected: "vėsinimo" },
    { pattern: /\bgroteles\b/iu, expected: "grotelės" },
    { pattern: /\bpadekliukas\b/iu, expected: "padėkliukas" },
    { pattern: /\bstiklainiu\b/iu, expected: "stiklainių" },
    { pattern: /\bkubeliu\b/iu, expected: "kubelių" },
    { pattern: /\bformele\b/iu, expected: "formelė" },
    { pattern: /\bteslos\b/iu, expected: "tešlos" },
    { pattern: /\bmiltu\b/iu, expected: "miltų" },
    { pattern: /\bformeles\b/iu, expected: "formelės" },
    { pattern: /\bkeksiuku\b/iu, expected: "keksiukų" },
    { pattern: /\bpopiereliai\b/iu, expected: "popierėliai" },
    { pattern: /\bdantu\b/iu, expected: "dantų" },
    { pattern: /\bkrapstukai\b/iu, expected: "krapštukai" },
    { pattern: /\biesmeliai\b/iu, expected: "iešmeliai" },
    { pattern: /\bsiulas\b/iu, expected: "siūlas" },
    { pattern: /\bsurio\b/iu, expected: "sūrio" },
    { pattern: /\bmaiselis\b/iu, expected: "maišelis" },
  ],
};

const latvianRules = {
  labels: ["Latvian"],
  patterns: [
    { pattern: /\bir\s+atvilktne\b/iu, expected: "ir atvilktnē" },
    { pattern: /\bblodai\b/iu, expected: "bļodai" },
    { pattern: /\bkiploku\b/iu, expected: "ķiploku" },
    { pattern: /\bkartupelu\b/iu, expected: "kartupeļu" },
    { pattern: /\bstampatajs\b/iu, expected: "stampātājs" },
    { pattern: /\bgriezejs\b/iu, expected: "griezējs" },
    { pattern: /\bskeres\b/iu, expected: "šķēres" },
    { pattern: /\bdzesesanas\b/iu, expected: "dzesēšanas" },
    { pattern: /\bdzesešanas\b/iu, expected: "dzesēšanas" },
    { pattern: /\batverejs\b/iu, expected: "atvērējs" },
    { pattern: /\bkubinu\b/iu, expected: "kubiņu" },
    { pattern: /\bmiklaskrapis\b/iu, expected: "mīklas skrāpis" },
    { pattern: /\bcepampapirs\b/iu, expected: "cepampapīrs" },
    { pattern: /\bformites\b/iu, expected: "formītes" },
    { pattern: /\bbakstamie\b/iu, expected: "bakstāmie" },
    { pattern: /\biesmini\b/iu, expected: "iesmiņi" },
    { pattern: /\bmaisins\b/iu, expected: "maisiņš" },
  ],
};

const finnishRules = {
  labels: ["Finnish"],
  patterns: [
    { pattern: /\bkeittiovaaka\b/iu, expected: "keittiövaaka" },
    { pattern: /\bvieressa\b/iu, expected: "vieressä" },
  ],
};

export const latinDiacriticLossLanguageCodes = [
  "DA",
  "NB",
  "SV",
  "ES",
  "ES-419",
  "CS",
  "SK",
  "HU",
  "RO",
  "HR",
  "SR",
  "LT",
  "LV",
  "FI",
];

const languageRules = {
  DA: {
    labels: ["Danish"],
    patterns: [
      { pattern: /\bpa\b/iu, expected: "på" },
      { pattern: /\bskalen\b/iu, expected: "skålen" },
      { pattern: /\bkokken/iu, expected: "køkken" },
      { pattern: /\bhvidlog/iu, expected: "hvidløg" },
      { pattern: /\bafkol/iu, expected: "afkøl" },
      { pattern: /\bglasabner\b/iu, expected: "glasåbner" },
      { pattern: /\bsprojte/iu, expected: "sprøjte" },
      { pattern: /\bpizzaskaerer/iu, expected: "pizzaskærer" },
      { pattern: /\btraespyd\b/iu, expected: "træspyd" },
      { pattern: /\bbordskaner\b/iu, expected: "bordskåner" },
      { pattern: /\bosteklaede\b/iu, expected: "osteklæde/ostelærred" },
    ],
  },
  NB: {
    labels: ["Norwegian Bokmål"],
    patterns: [
      { pattern: /\bpa\b/iu, expected: "på" },
      { pattern: /\bkjokken/iu, expected: "kjøkken" },
      { pattern: /\bhvitlok/iu, expected: "hvitløk" },
      { pattern: /\bavkjol/iu, expected: "avkjøl" },
      { pattern: /\bglassapner\b/iu, expected: "glassåpner" },
      { pattern: /\bsproyte/iu, expected: "sprøyte" },
      { pattern: /\bpizzaskjaer/iu, expected: "pizzaskjær" },
    ],
  },
  SV: {
    labels: ["Swedish"],
    patterns: [
      { pattern: /\bpa\b/iu, expected: "på" },
      { pattern: /\bbanken\b/iu, expected: "bänken" },
      { pattern: /\bladan\b/iu, expected: "lådan" },
      { pattern: /\bskalen\b/iu, expected: "skålen" },
      { pattern: /\bkoksvag\b/iu, expected: "köksvåg" },
      { pattern: /\bkokssax/iu, expected: "kökssax" },
      { pattern: /\bkokstermometer\b/iu, expected: "kökstermometer" },
      { pattern: /\bkokstimer\b/iu, expected: "kökstimer" },
      { pattern: /\bkokssnore\b/iu, expected: "kökssnöre/stekgarn" },
      { pattern: /\bvitlok/iu, expected: "vitlök" },
      { pattern: /\bmjol/iu, expected: "mjöl" },
      { pattern: /\bburkopp/iu, expected: "burköpp" },
      { pattern: /\bbakplatspapper\b/iu, expected: "bakplåtspapper" },
      { pattern: /\bspritspase\b/iu, expected: "spritspåse" },
      { pattern: /\bpizzaskarare\b/iu, expected: "pizzaskärare" },
      { pattern: /\bpotatisstot\b/iu, expected: "potatisstöt" },
      { pattern: /\btragrillspett\b/iu, expected: "trägrillspett" },
    ],
  },
  ES: spanishRules,
  "ES-419": spanishRules,
  CS: czechRules,
  SK: slovakRules,
  HU: hungarianRules,
  RO: romanianRules,
  HR: croatianRules,
  SR: serbianRules,
  LT: lithuanianRules,
  LV: latvianRules,
  FI: finnishRules,
};

function textFields(row) {
  const transcription = typeof row.transcription === "string" ? row.transcription.trim() : "";
  return [
    ["native_word", row.native_word],
    ["display_word", row.display_word ?? row.word_with_article_or_marker],
    ["word_with_article_or_marker", row.word_with_article_or_marker],
    // IPA strings can legitimately contain ASCII sequences like "pa"; Latin spelling
    // diacritic-loss rules only apply to orthographic or romanized text.
    ["transcription", /^\/.+\/$/.test(transcription) ? "" : row.transcription],
    ["example_text", row.example_text],
  ].filter(([, value]) => typeof value === "string" && value.trim() !== "");
}

export function buildLatinDiacriticLossFindings(rows) {
  const blockers = [];
  for (const row of rows) {
    const languageCode = row.language_code ?? row.languageCode;
    const rules = languageRules[languageCode];
    if (!rules) continue;
    for (const [field, value] of textFields(row)) {
      for (const rule of rules.patterns) {
        if (rule.fields && !rule.fields.includes(field)) continue;
        if (!rule.pattern.test(value)) continue;
        blockers.push({
          set_id: row.set_id,
          display_order: row.display_order,
          meaning_id: row.meaning_id,
          language_code: languageCode,
          field,
          value,
          expected: rule.expected,
        });
      }
    }
  }
  return { blockers };
}

export function formatLatinDiacriticLossFinding(finding) {
  return `${finding.language_code} ${finding.meaning_id} ${finding.field} has likely ASCII/diacritic loss "${finding.value}", expected ${finding.expected}`;
}
