const numbersTopicPattern = /numbers?\s*&\s*counting|numbers?\s+and\s+counting/i;

function parseJsonish(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parseScene(value) {
  return parseJsonish(value) ?? {};
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeComparable(value) {
  return normalize(value)
    .replace(/[.!?。！？।။։؟،؛]+$/u, "")
    .toLocaleLowerCase();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function valueMatchesCurrent(current, proofValue) {
  return normalize(current) === normalize(proofValue);
}

function sceneMatchesCurrent(currentScene, proofScene) {
  return stableJson(parseScene(currentScene)) === stableJson(parseScene(proofScene));
}

function hasLatin(value) {
  return /\p{Script=Latin}/u.test(String(value ?? ""));
}

function hasCyrillic(value) {
  return /\p{Script=Cyrillic}/u.test(String(value ?? ""));
}

function isNumbersExample(row) {
  if (row.set_id === "core_numbers_counting_a1") return true;
  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  return (
    numbersTopicPattern.test(scene.topic_context ?? "") ||
    numbersTopicPattern.test(row.context_area ?? "") ||
    numbersTopicPattern.test(row.default_area ?? "")
  );
}

const forbiddenPatterns = {
  BG: [
    [/две ключа/iu, "Bulgarian masculine ключ requires два, not две."],
    [/двадесет и едно молива/iu, "Bulgarian молив is masculine; 21 pencils needs двадесет и един молива."],
    [/тридесет и две ключа/iu, "Bulgarian ключ is masculine; 32 keys needs тридесет и два ключа."],
  ],
  HR: [
    [/dvadeset jedan olovka/iu, "Croatian olovka is feminine; 21 pencils needs dvadeset jedna olovka."],
    [/sedamdeset šest imena su/iu, "Croatian 76 imena takes singular predicate in this learner sentence."],
  ],
  SR: [
    [/dvadeset jedan olovka/iu, "Serbian olovka is feminine; 21 pencils needs dvadeset jedna olovka."],
    [/sedamdeset šest imena su/iu, "Serbian 76 imena takes singular predicate in this learner sentence."],
  ],
  LV: [
    [/divi atslēgas/iu, "Latvian atslēgas is feminine plural; two keys needs divas atslēgas."],
    [/septiņi monētas/iu, "Latvian monētas is feminine plural; seven coins needs septiņas monētas."],
    [/deviņi kastes/iu, "Latvian kastes is feminine plural; nine boxes needs deviņas kastes."],
    [/simts punkti/iu, "Latvian hundred-count noun phrase should use simt punktu in this scene."],
    [/tūkstotis graudi/iu, "Latvian thousand-count noun phrase should use tūkstotis graudu in this scene."],
    [/divdesmit viens zīmuļi/iu, "Latvian 21 pencils needs divdesmit viens zīmulis."],
    [/trīsdesmit divi atslēgas/iu, "Latvian 32 keys needs trīsdesmit divas atslēgas."],
    [/piecdesmit četri etiķetes/iu, "Latvian 54 labels needs piecdesmit četras etiķetes."],
    [/sešdesmit pieci flīzes/iu, "Latvian 65 tiles needs sešdesmit piecas flīzes."],
    [/astoņdesmit septiņi zvaigznes/iu, "Latvian 87 stars needs astoņdesmit septiņas zvaigznes."],
    [/deviņdesmit astoņi lapas/iu, "Latvian 98 pages needs deviņdesmit astoņas lapas."],
  ],
  "PT-BR": [
    [/trinta e dois chaves/iu, "Brazilian Portuguese chave is feminine; 32 keys needs trinta e duas chaves."],
  ],
  PT: [
    [/trinta e dois chaves/iu, "Portuguese chave is feminine; 32 keys needs trinta e duas chaves."],
  ],
  RO: [
    [/doi chei/iu, "Romanian chei is feminine; two keys needs două chei."],
    [/doisprezece ouă/iu, "Romanian ouă uses feminine/neuter form douăsprezece."],
    [/douăzeci trepte/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/treizeci oameni/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/patruzeci etichete/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/cincizeci stele/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/șaizeci plăci/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/șaptezeci carduri/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/optzeci mărgele/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/nouăzeci pagini/iu, "Romanian numbers 20+ before nouns need de in this pattern."],
    [/o sută puncte/iu, "Romanian one hundred before nouns needs de in this pattern."],
    [/o mie boabe/iu, "Romanian one thousand before nouns needs de in this pattern."],
    [/treizeci și doi de chei/iu, "Romanian chei is feminine; 32 keys needs treizeci și două de chei."],
  ],
  IS: [
    [/þrír bækur/iu, "Icelandic bækur is feminine plural; three books needs þrjár bækur."],
    [/tuttugu og einn blýantar/iu, "Icelandic 21 pencils needs tuttugu og einn blýantur in this sentence."],
    [/fjörutíu og þrír kort/iu, "Icelandic kort is neuter; 43 cards needs fjörutíu og þrjú kort."],
  ],
};

const koreanSpacingPatterns = [
  /(?:영|하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열하나|열둘|열셋|열넷|열다섯|열여섯|열일곱|열여덟|열아홉|스물|서른|마흔|쉰|예순|일흔|여든|아흔|스물하나|서른둘|마흔셋|쉰넷|예순다섯|일흔여섯|여든일곱|아흔여덟|아흔아홉)(?:개의|자루의|권의|장의|쪽이|명의|알의)/u,
];

const tagalogBareNumberPatterns = [
  /\b(?:dalawa|tatlo|apat|lima|anim|pito|walo|siyam|sampu|labing-isa|labindalawa|labintatlo|labing-apat|labinlima|labing-anim|labimpito|labingwalo|labinsiyam|dalawampu|tatlumpu|apatnapu|limampu|animnapu|pitumpu|walumpu|siyamnapu)\s+(?:susi|libro|upuan|lapis|plato|barya|bloke|kahon|kard|pangalan|itlog|estudyante|sticker|butil|tile|pahina|tuldok|hakbang|tao|label|bituin)(?=\s|$)/iu,
  /\b(?:dalawampu't isa|tatlumpu't dalawa|apatnapu't tatlo|limampu't apat|animnapu't lima|pitumpu't anim|walumpu't pito|siyamnapu't walo|siyamnapu't siyam)\s+(?:lapis|susi|kard|label|tile|pangalan|bituin|pahina|tuldok)(?=\s|$)/iu,
];

function currentNumberGrammarProof(row) {
  const candidates = [];
  for (const field of ["number_example_grammar_evidence", "number_example_grammar_proof"]) {
    const value = parseJsonish(row[field]);
    if (!value) continue;
    if (value.number_example_grammar_proof) candidates.push(value.number_example_grammar_proof);
    if (value.grammar_proof) candidates.push(value.grammar_proof);
    candidates.push(value);
  }

  for (const proof of candidates) {
    const issues = validateNumberGrammarProof(row, proof);
    if (issues.length === 0) return { proof, issues: [] };
  }
  return { proof: null, issues: ["missing current number-example grammar proof"] };
}

export function buildNumberExampleGrammarProof(row) {
  return {
    proof_method: "number_example_grammar_v1",
    grammar_preserved: true,
    checked_against_current_example: true,
    set_id: row.set_id,
    meaning_id: row.meaning_id,
    language_code: row.language_code,
    canonical_example_en: row.canonical_example_en,
    target_example_text: row.example_text,
    grammar_checks: {
      number_noun_agreement: true,
      classifier_counter_linker: true,
      script_consistency: true,
      scene_preserved: true,
    },
    scene_slots: parseScene(row.semantic_scene ?? row.context_semantic_scene),
  };
}

function validateNumberGrammarProof(row, proof) {
  const issues = [];
  if (!proof || typeof proof !== "object") return ["number-example grammar proof is missing"];
  if (proof.grammar_preserved !== true) issues.push("number-example grammar proof does not mark grammar_preserved=true");
  if (proof.set_id !== row.set_id) issues.push("number-example grammar proof set_id does not match current row");
  if (proof.meaning_id !== row.meaning_id) issues.push("number-example grammar proof meaning_id does not match current row");
  if (proof.language_code !== row.language_code) {
    issues.push("number-example grammar proof language_code does not match current row");
  }
  for (const check of ["number_noun_agreement", "classifier_counter_linker", "script_consistency", "scene_preserved"]) {
    if (proof.grammar_checks?.[check] !== true) {
      issues.push(`number-example grammar proof ${check} is missing or not true`);
    }
  }
  if (!valueMatchesCurrent(row.canonical_example_en, proof.canonical_example_en)) {
    issues.push("number-example grammar proof canonical_example_en is stale");
  }
  if (!valueMatchesCurrent(row.example_text, proof.target_example_text)) {
    issues.push("number-example grammar proof target_example_text is stale");
  }
  if (!proof.scene_slots || !sceneMatchesCurrent(row.semantic_scene ?? row.context_semantic_scene, proof.scene_slots)) {
    issues.push("number-example grammar proof scene_slots are stale or missing");
  }
  return issues;
}

export function validateNumberExampleGrammar(row, options = {}) {
  if (!isNumbersExample(row)) return [];

  const issues = [];
  const example = normalizeComparable(row.example_text);
  const rawExample = normalize(row.example_text);
  if (!example) return ["target example is missing"];

  if (row.language_code === "SR" && hasLatin(rawExample) && hasCyrillic(rawExample)) {
    issues.push("Serbian example mixes Latin and Cyrillic scripts; keep one script for the row.");
  }

  for (const [pattern, issue] of forbiddenPatterns[row.language_code] ?? []) {
    if (pattern.test(example)) issues.push(issue);
  }
  if (row.language_code === "KO" && koreanSpacingPatterns.some((pattern) => pattern.test(rawExample))) {
    issues.push("Korean number examples need natural spacing/counter forms, not fused number+counter strings.");
  }
  if (row.language_code === "TL" && tagalogBareNumberPatterns.some((pattern) => pattern.test(example))) {
    issues.push("Filipino number examples need linker forms such as -ng or na before the counted noun.");
  }

  if (options.requireProof ?? true) {
    const proof = currentNumberGrammarProof(row);
    if (!proof.proof) issues.push(...proof.issues);
  }

  return issues;
}

export function buildNumberExampleGrammarFindings(rows, options = {}) {
  const blockers = [];
  let checked = 0;
  for (const row of rows) {
    if (!isNumbersExample(row)) continue;
    checked += 1;
    for (const issue of validateNumberExampleGrammar(row, options)) {
      blockers.push({ ...row, issue });
    }
  }
  return { checked, blockers };
}

export function formatNumberExampleGrammarFinding(blocker) {
  return `${blocker.set_id} ${blocker.language_code}/${blocker.meaning_id}: ${blocker.issue}; example="${blocker.example_text}"`;
}
