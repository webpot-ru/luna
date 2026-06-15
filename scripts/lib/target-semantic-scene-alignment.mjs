const sceneMarkers = {
  on_the_counter: {
    EN: ["on the counter"],
    "EN-GB": ["on the worktop", "on the counter"],
    ES: ["en la encimera", "sobre la encimera", "en la barra", "en el mostrador", "sobre el mostrador"],
    "ES-419": ["en la barra", "en la encimera", "en el mostrador", "sobre el mostrador", "sobre la mesada", "sobre la barra", "sobre la barra de la cocina"],
    FR: ["sur le plan de travail", "sur le comptoir"],
    DE: ["auf der Arbeitsplatte", "auf der Theke", "auf dem Tresen"],
    IT: ["sul piano", "sul bancone"],
    PT: ["na bancada", "no balcão", "no balcao"],
    "PT-BR": ["na bancada", "no balcão", "no balcao"],
    RU: ["на столешнице", "на стойке"],
    ZH: ["在台面上", "台面上", "在柜台上", "柜台上", "在吧台上", "吧台上"],
    JA: ["カウンターの上"],
    KO: ["조리대 위", "카운터 위"],
    VI: ["trên quầy bếp", "ở trên quầy bếp", "ở trên mặt bếp", "trên quầy"],
    TH: ["บนเคาน์เตอร์"],
    MS: ["di atas kaunter"],
    ID: ["di atas meja dapur", "di atas konter", "di konter", "di atas meja"],
    PL: ["na blacie", "na ladzie"],
    NL: ["op het aanrecht", "op de toonbank", "op de bar"],
    SV: ["på bänken", "pa banken", "på köksbänken", "pa koksbanken", "på disken", "pa disken"],
    NB: ["på benken", "pa benken", "på kjøkkenbenken", "pa kjokkenbenken", "på disken", "pa disken"],
    DA: ["på bordpladen", "pa bordpladen", "på køkkenbordet", "pa køkkenbordet", "pa kokkenbordet", "på disken", "pa disken"],
    FI: ["tasolla", "tiskillä", "tiskilla"],
    CS: ["na lince", "na pultu"],
    SK: ["na linke", "na pulte"],
    HU: ["pulton"],
    RO: ["pe blat", "pe tejghea"],
    BG: ["на плота", "на кухненския плот"],
    HR: ["na radnoj plohi", "na pultu", "na radnoj površini", "na radnoj povrsini", "na šanku", "na sanku"],
    SR: ["na radnoj ploči", "na radnoj ploci", "na pultu", "na kuhinjskom pultu", "na radnoj površini", "na radnoj povrsini", "na šanku", "na sanku"],
    SL: ["na pultu", "na šanku", "na sanku"],
    LT: ["ant stalviršio", "ant stalvirsio", "ant virtuvės stalviršio", "ant virtuves stalvirsio", "ant prekystalio"],
    LV: ["uz letes", "uz virtuves letes"],
    ET: ["letil", "tööpinnal", "toopinnal"],
    IS: ["á bekknum", "a bekknum", "á borðplötunni", "a bordplotunni", "á eldhúsbekknum", "a eldhúsbekknum", "á eldhusbekknum", "a eldhusbekknum", "á afgreiðsluborðinu", "a afgreiðsluborðinu", "á afgreidslubordinu", "a afgreidslubordinu", "á borðinu", "a bordinu"],
    HI: ["काउंटर पर"],
    BN: ["কাউন্টারের উপর", "কাউন্টারে"],
    TL: ["nasa counter", "nasa ibabaw ng counter", "sa ibabaw ng counter"],
    MY: ["ကောင်တာပေါ်မှာ", "ကောင်တာပေါ်တွင်"],
    KM: ["នៅលើតុផ្ទះបាយ", "នៅលើកន្លែងរៀបចំម្ហូប", "នៅលើតុបញ្ជរ", "នៅលើបញ្ជរ"],
    LO: ["ເທິງເຄົາເຕີ", "ຢູ່ເຄົາເຕີ"],
    NE: ["काउन्टरमा"],
    SI: ["කවුන්ටරය මත", "කවුන්ටරය උඩ", "කවුන්ටරයේ"],
    TA: ["கவுண்டரில்"],
    TE: ["కౌంటర్ మీద", "కౌంటర్‌పై"],
    KN: ["ಕೌಂಟರ್ ಮೇಲೆ", "ಕೌಂಟರ್‌ನಲ್ಲಿದೆ", "ಕೌಂಟರ್‌ನಲ್ಲಿ"],
    ML: ["കൗണ്ടറിന് മുകളിൽ", "കൗണ്ടറിലാണ്", "കൗണ്ടറിൽ"],
    UZ: ["peshtaxtada", "peshtaxta ustida"],
    KK: ["үстелде", "асүй үстелінде", "сөреде", "бар сөресінде"],
    AZ: ["tezgahta", "piştaxtanın üstündə", "pistaxtanin ustunde", "piştaxtadadır", "pistaxtadadir", "kassadadır", "kassadadir"],
    KA: ["დახლზე"],
    HY: ["սեղանածածկի վրա", "սեղանատախտակի վրա", "վաճառասեղանի վրա", "վաճառասեղանին", "հաշվեպանի վրա"],
    TR: ["tezgahın üzerindedir", "tezgahta", "tezgahın üstünde", "tezgahin ustunde", "tezgahın üzerinde", "tezgahin uzerinde"],
    SW: ["juu ya kaunta", "kwenye kaunta", "kauntani"],
  },
  in_the_drawer: {
    EN: ["in the drawer"],
    "EN-GB": ["in the drawer"],
    ES: ["en el cajón", "en el cajon"],
    "ES-419": ["en el cajón", "en el cajon"],
    FR: ["dans le tiroir"],
    DE: ["in der Schublade"],
    IT: ["nel cassetto"],
    PT: ["na gaveta"],
    "PT-BR": ["na gaveta"],
    RU: ["в ящике"],
    ZH: ["在抽屉里"],
    JA: ["引き出し"],
    KO: ["서랍 안"],
    VI: ["trong ngăn kéo"],
    TH: ["ในลิ้นชัก"],
    MS: ["di dalam laci"],
    ID: ["di dalam laci"],
    PL: ["w szufladzie"],
    NL: ["in de lade", "in de la"],
    SV: ["i lådan", "i ladan"],
    NB: ["i skuffen"],
    DA: ["i skuffen"],
    FI: ["laatikossa"],
    CS: ["v zásuvce", "v zasuvce"],
    SK: ["v zásuvke", "v zasuvke"],
    HU: ["fiokban"],
    RO: ["în sertar", "in sertar"],
    BG: ["в чекмеджето"],
    HR: ["u ladici"],
    SR: ["u fioci", "у фиоци"],
    SL: ["v predalu"],
    LT: ["stalčiuje", "stalciuje"],
    LV: ["atvilktnē", "atvilktne"],
    ET: ["sahtlis"],
    IS: ["í skúffunni", "i skúffunni"],
    HI: ["दराज़ में"],
    BN: ["ড্রয়ারে"],
    TL: ["nasa drawer", "sa loob ng drawer"],
    MY: ["အံဆွဲထဲမှာ", "အံဆွဲထဲတွင်"],
    KM: ["នៅក្នុងថត"],
    LO: ["ໃນລິ້ນຊັກ"],
    NE: ["दराजमा"],
    SI: ["ලාච්චුවේ"],
    TA: ["டிராயரில்", "இழுப்பறையில்"],
    TE: ["డ్రాయర్‌లో"],
    KN: ["ಡ್ರಾಯರ್‌ನಲ್ಲಿ"],
    ML: ["ഡ്രോയറിൽ", "ഡ്രോയറിലാണ്"],
    UZ: ["tortmada", "tortma ichida"],
    KK: ["тартпада"],
    AZ: ["siyirtmədədir", "siyirtmədə", "siyirmədədir", "siyirmədə"],
    KA: ["უჯრაშია", "უჯრაში არის"],
    HY: ["դարակում"],
    TR: ["çekmecededir", "çekmecede"],
    SW: ["ndani ya droo", "kwenye droo"],
  },
  beside_the_bowl: {
    EN: ["beside the bowl"],
    "EN-GB": ["beside the bowl"],
    ES: ["junto al bol"],
    "ES-419": ["junto al tazón", "junto al tazon"],
    FR: ["près du bol", "pres du bol", "à côté du bol", "a cote du bol"],
    DE: ["neben der Schüssel", "neben der Schussel"],
    IT: ["accanto alla ciotola"],
    PT: ["ao lado da tigela"],
    "PT-BR": ["ao lado da tigela"],
    RU: ["рядом с миской"],
    ZH: ["在碗旁边"],
    JA: ["ボウルのそば"],
    KO: ["그릇 옆"],
    VI: ["cạnh cái bát", "canh cai bat"],
    TH: ["ข้างชาม"],
    MS: ["sebelah mangkuk"],
    ID: ["samping mangkuk"],
    PL: ["obok miski"],
    NL: ["naast de kom"],
    SV: ["bredvid skålen", "bredvid skalen"],
    NB: ["ved siden av bollen"],
    DA: ["ved siden af skålen", "ved siden af skalen"],
    FI: ["kulhon vieressä", "kulhon vieressa"],
    CS: ["vedle misky"],
    SK: ["vedľa misky", "vedla misky"],
    HU: ["tál mellett", "tal mellett"],
    RO: ["lângă bol", "langa bol"],
    BG: ["до купата"],
    HR: ["pokraj zdjele"],
    SR: ["pored činije", "pored cinije"],
    SL: ["ob skledi"],
    LT: ["šalia dubens", "salia dubens"],
    LV: ["blakus bļodai", "blakus blodai"],
    ET: ["kausi kõrval", "kausi korval"],
    IS: ["við skálina", "vid skálina"],
    HI: ["कटोरे के पास"],
    BN: ["বাটির পাশে"],
    TL: ["katabi ng mangkok"],
    MY: ["ဇလုံဘေးမှာ"],
    KM: ["នៅក្បែរចានធំ"],
    LO: ["ຂ້າງຖ້ວຍ"],
    NE: ["कचौराको छेउमा"],
    SI: ["බඳුන අසල"],
    TA: ["கிண்ணத்தின் அருகில்"],
    TE: ["గిన్నె పక్కన"],
    KN: ["ಬಟ್ಟಲಿನ ಪಕ್ಕ"],
    ML: ["കിണ്ണത്തിനരികിൽ"],
    UZ: ["kosa yonida"],
    KK: ["тостағанның жанында"],
    AZ: ["kasənin yanındadır", "kasənin yanında"],
    KA: ["ჯამის გვერდითაა"],
    HY: ["ամանի կողքին"],
    TR: ["kasenin yanındadır", "kasenin yanında"],
    SW: ["kando ya bakuli"],
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

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[.!?。！？।။။։؟،؛]+$/u, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function normalizeComparable(value) {
  return normalize(value)
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasLatin(value) {
  return /\p{Script=Latin}/u.test(String(value ?? ""));
}

function normalizeLatinComparable(value) {
  return normalizeComparable(value)
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "");
}

function containsMarker(exampleText, marker) {
  const text = normalizeComparable(exampleText);
  const expected = normalizeComparable(marker);
  if (text && expected && text.includes(expected)) return true;
  if (hasLatin(text) || hasLatin(expected)) {
    const foldedText = normalizeLatinComparable(exampleText);
    const foldedExpected = normalizeLatinComparable(marker);
    return Boolean(foldedText && foldedExpected && foldedText.includes(foldedExpected));
  }
  return false;
}

const sceneProofEvidenceFields = [
  "semantic_scene_proof",
  "scene_alignment_proof",
  "target_semantic_scene_alignment",
];

const semanticSceneProofRequiredKeys = [
  "target_object",
  "target_display",
  "subject_number",
  "action_or_state",
  "state_or_location",
  "tense_aspect",
  "topic_context",
];

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

function collectSceneProofCandidates(value, candidates = []) {
  const object = parseJsonish(value);
  if (!object) return candidates;

  for (const field of sceneProofEvidenceFields) {
    const nested = parseJsonish(object[field]);
    if (nested) candidates.push(nested);
  }

  const sceneSlotProof = parseJsonish(object.scene_slot_proof);
  if (sceneSlotProof) candidates.push(sceneSlotProof);

  if (object.runner_evidence) collectSceneProofCandidates(object.runner_evidence, candidates);
  if (object.evidence) collectSceneProofCandidates(object.evidence, candidates);

  if (
    object.proof_method ||
    object.scene_preserved === true ||
    object.checked_against_current_example === true
  ) {
    candidates.push(object);
  }

  return candidates;
}

function normalizeProofText(value) {
  return normalize(value).toLocaleLowerCase();
}

function valueMatchesCurrent(rowValue, proofValue) {
  if (rowValue === undefined || rowValue === null || rowValue === "") return true;
  return normalizeProofText(rowValue) === normalizeProofText(proofValue);
}

function sceneSlotValueMatchesCurrent(rowValue, proofValue) {
  if (rowValue === undefined || rowValue === null || rowValue === "") return true;
  return normalizeComparable(rowValue) === normalizeComparable(proofValue);
}

function validateSceneSlotProof(row, proof) {
  const issues = [];
  if (!proof || typeof proof !== "object") return ["missing scene-slot proof"];

  if (proof.scene_preserved !== true && proof.supported !== true) {
    issues.push("scene-slot proof must mark scene_preserved/support=true");
  }
  if (!proof.proof_method) {
    issues.push("scene-slot proof is missing proof_method");
  }
  if (proof.checked_against_current_example !== true) {
    issues.push("scene-slot proof must be checked against the current example");
  }
  if (proof.language_code && proof.language_code !== (row.language_code ?? row.db_code)) {
    issues.push(`scene-slot proof language_code=${proof.language_code} does not match current row`);
  }
  if (proof.meaning_id && proof.meaning_id !== (row.meaning_id ?? row.meaningId)) {
    issues.push(`scene-slot proof meaning_id=${proof.meaning_id} does not match current row`);
  }
  if (!valueMatchesCurrent(row.canonical_example_en ?? row.source_example_en, proof.canonical_example_en)) {
    issues.push("scene-slot proof canonical_example_en is stale");
  }
  if (!valueMatchesCurrent(row.example_text ?? row.target_example, proof.target_example_text)) {
    issues.push("scene-slot proof target_example_text is stale");
  }

  const scene = parseScene(row.semantic_scene ?? row.context_semantic_scene);
  const proofScene = parseJsonish(proof.scene_slots) ?? parseJsonish(proof.source_scene);
  if (!proofScene) {
    issues.push("scene-slot proof is missing scene_slots");
  } else {
    for (const key of semanticSceneProofRequiredKeys) {
      if (!sceneSlotValueMatchesCurrent(scene[key], proofScene[key])) {
        issues.push(`scene-slot proof ${key} is stale or missing`);
      }
    }
  }

  return issues;
}

function currentSceneSlotProof(row) {
  const candidates = [];
  for (const field of sceneProofEvidenceFields) {
    collectSceneProofCandidates(row[field], candidates);
  }
  collectSceneProofCandidates(row.semantic_preservation_evidence, candidates);
  collectSceneProofCandidates(row.target_example_naturalness_evidence, candidates);
  collectSceneProofCandidates(row.target_example_lexical_anchor_evidence, candidates);
  collectSceneProofCandidates(row.target_example_pedagogical_quality_evidence, candidates);

  let firstIssue = null;
  for (const candidate of candidates) {
    const issues = validateSceneSlotProof(row, candidate);
    if (issues.length === 0) return { proof: candidate, issues: [] };
    firstIssue ??= issues;
  }
  return { proof: null, issues: firstIssue ?? ["missing current scene-slot proof"] };
}

function normalizeSceneLocation(value) {
  return normalizeComparable(value)
    .replace(/\b(the|a|an)\b/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function inferTargetSceneKey(rowOrScene) {
  const scene = parseScene(rowOrScene?.semantic_scene ?? rowOrScene?.context_semantic_scene ?? rowOrScene);
  const location = normalizeSceneLocation(scene.state_or_location);
  if (location === "on counter") return "on_the_counter";
  if (location === "in drawer") return "in_the_drawer";
  if (location === "beside bowl" || location === "near bowl" || location === "next to bowl") {
    return "beside_the_bowl";
  }
  return null;
}

export function targetSceneAlignmentProof(row) {
  const sceneKey = inferTargetSceneKey(row);
  const proofBacked = currentSceneSlotProof(row);
  if (!sceneKey) {
    if (proofBacked.proof) {
      return {
        supported: true,
        proof_backed: true,
        scene_key: proofBacked.proof.scene_key ?? "scene_slot_proof",
        matched_marker: proofBacked.proof.proof_method,
        expected_markers: [],
        scene_slot_proof: proofBacked.proof,
      };
    }
    return {
      supported: false,
      scene_key: null,
      matched_marker: null,
      expected_markers: [],
      unsupported_reason: proofBacked.issues.join("; "),
    };
  }

  const languageCode = row.language_code ?? row.db_code;
  const expectedMarkers = sceneMarkers[sceneKey]?.[languageCode] ?? [];
  if (expectedMarkers.length === 0 && proofBacked.proof) {
    return {
      supported: true,
      proof_backed: true,
      scene_key: sceneKey,
      matched_marker: proofBacked.proof.proof_method,
      expected_markers: [],
      scene_slot_proof: proofBacked.proof,
    };
  }
  const matchedMarker = expectedMarkers.find((marker) => containsMarker(row.example_text, marker)) ?? null;
  return {
    supported: true,
    scene_key: sceneKey,
    matched_marker: matchedMarker,
    expected_markers: expectedMarkers,
  };
}

export function validateTargetSemanticSceneAlignment(row, options = {}) {
  const issues = [];
  const requireSupported = options.requireSupported ?? true;
  const proof = targetSceneAlignmentProof(row);
  if (!proof.supported) {
    if (requireSupported) {
      issues.push(
        `target semantic scene is unsupported by deterministic markers and has no current scene-slot proof: ${proof.unsupported_reason ?? "missing proof"}`
      );
    }
    return issues;
  }

  const exampleText = normalize(row.example_text);
  if (!exampleText) {
    issues.push("target example is missing");
    return issues;
  }

  if (proof.proof_backed) return issues;

  if (proof.expected_markers.length === 0) {
    issues.push(`no target-scene markers configured for ${row.language_code}/${proof.scene_key}`);
    return issues;
  }

  if (!proof.matched_marker) {
    issues.push(
      `target example does not preserve semantic_scene ${proof.scene_key}; expected one of: ${proof.expected_markers.join(" | ")}`
    );
  }
  return issues;
}

export function buildTargetSemanticSceneAlignmentFindings(rows, options = {}) {
  const blockers = [];
  let checked = 0;
  let skipped = 0;
  const requireSupported = options.requireSupported ?? true;

  for (const row of rows) {
    const proof = targetSceneAlignmentProof(row);
    if (!proof.supported) {
      if (!requireSupported) {
        skipped += 1;
        continue;
      }
    } else {
      checked += 1;
    }
    for (const issue of validateTargetSemanticSceneAlignment(row, { requireSupported })) {
      blockers.push({
        set_id: row.set_id ?? row.setId,
        display_order: row.display_order ?? row.displayOrder,
        meaning_id: row.meaning_id ?? row.meaningId,
        example_id: row.example_id ?? row.context_example_id ?? row.exampleId,
        language_code: row.language_code ?? row.languageCode,
        canonical_english: row.canonical_english ?? row.canonicalEnglish ?? "",
        display_word: row.display_word ?? row.target_display_word ?? "",
        example_text: row.example_text ?? row.target_example ?? "",
        scene_key: proof.scene_key,
        expected_markers: proof.expected_markers,
        proof_backed: proof.proof_backed === true,
        issue,
      });
    }
  }

  return { blockers, checked, skipped };
}

export function formatTargetSemanticSceneAlignmentFinding(finding) {
  return `${finding.set_id} ${finding.language_code}/${finding.meaning_id}: ${finding.issue}; example="${finding.example_text}"`;
}
