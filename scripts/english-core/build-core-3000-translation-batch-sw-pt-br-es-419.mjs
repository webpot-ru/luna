#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.join("=") || "true"];
  }),
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(
  args.get("input") ??
    `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`,
);
const esInputPath = path.resolve(
  args.get("es-input") ??
    `outputs/english-core-3000/translation-batches/${releaseId}_translation_batch_ru_es_fr_v0.jsonl`,
);
const ptInputPath = path.resolve(
  args.get("pt-input") ??
    `outputs/english-core-3000/translation-batches/${releaseId}_translation_batch_de_it_pt_v0.jsonl`,
);
const outputDir = path.resolve(args.get("output-dir") ?? "outputs/english-core-3000/translation-batches");
const batchId = "sw_pt_br_es_419_v0";
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_${batchId}.jsonl`);
const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_${batchId}_summary.md`);

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

const sourceRows = await readJsonl(inputPath);
const esRowsById = new Map((await readJsonl(esInputPath)).map((row) => [row.core_item_id, row]));
const ptRowsById = new Map((await readJsonl(ptInputPath)).map((row) => [row.core_item_id, row]));

const sw = {
  core3000_0001: ["kibainishi dhahiri", "Mlango uko wazi."],
  core3000_0002: ["kuwa", "Ninataka kuwa tayari."],
  core3000_0003: ["na", "Chai na maji viko mezani."],
  core3000_0004: ["ya; cha", "Kikombe cha chai ni moto."],
  core3000_0005: ["kwenda; kwa", "Ninataka kwenda nyumbani."],
  core3000_0006: ["kibainishi kisicho dhahiri", "Nina kitabu."],
  core3000_0007: ["ndani ya; -ni", "Ufunguo uko ndani ya mfuko."],
  core3000_0008: ["kuwa na", "Nina simu."],
  core3000_0009: ["hiki; hii; hilo", "Kiko ndani ya mfuko."],
  core3000_0010: ["wewe; nyinyi", "Wewe ni rafiki yangu."],
  core3000_0011: ["yeye; mwanamume", "Yeye yuko shuleni."],
  core3000_0012: ["kwa ajili ya", "Zawadi hii ni kwa ajili yako."],
  core3000_0013: ["wao", "Wao wako nyumbani."],
  core3000_0014: ["si; ha-", "Sijachoka."],
  core3000_0015: ["hiyo; yule", "Kitabu hicho ni changu."],
  core3000_0016: ["sisi", "Tuko tayari."],
  core3000_0017: ["juu ya", "Kikombe kiko juu ya meza."],
  core3000_0018: ["na", "Niko na familia yangu."],
  core3000_0019: ["hii; hiki", "Kitabu hiki ni kipya."],
  core3000_0020: ["mimi", "Niko nyumbani."],
  core3000_0021: ["kufanya", "Ninafanya kazi yangu ya nyumbani."],
  core3000_0022: ["kama", "Anafanya kazi kama mwalimu."],
  core3000_0023: ["-ni; kwenye", "Nikute shuleni."],
  core3000_0024: ["yeye; mwanamke", "Yeye ni dada yangu."],
  core3000_0025: ["lakini", "Nimechoka, lakini nina furaha."],
  core3000_0026: ["kutoka", "Ninatoka Kanada."],
  core3000_0027: ["karibu na; kando ya", "Mfuko uko karibu na mlango."],
  core3000_0028: ["alama ya wakati ujao", "Nitakupigia simu."],
  core3000_0029: ["au", "Chai au kahawa inafaa."],
  core3000_0030: ["kusema", "Tafadhali sema jina lako."],
  core3000_0031: ["kwenda", "Ninaenda nyumbani baada ya shule."],
  core3000_0032: ["kwa hivyo", "Kumechelewa, kwa hivyo ninaenda nyumbani."],
  core3000_0033: ["wote; yote", "Wanafunzi wote wako hapa."],
  core3000_0034: ["pale; huko", "Weka mfuko pale."],
  core3000_0035: ["kujua", "Ninajua jibu."],
  core3000_0036: ["kupata", "Ninapata kitabu kipya leo."],
  core3000_0037: ["kufikiri", "Nafikiri hii ni sahihi."],
  core3000_0038: ["kutengeneza; kuandaa", "Ninaandaa chakula cha mchana nyumbani."],
  core3000_0039: ["wakati", "Wakati ni muhimu."],
  core3000_0040: ["kuona", "Ninaiona nyumba."],
  core3000_0041: ["nje", "Tafadhali toka nje sasa."],
  core3000_0042: ["nzuri; mzuri", "Hii ni siku nzuri."],
  core3000_0043: ["watu", "Watu wengi wako hapa."],
  core3000_0044: ["mwaka", "Mwaka una miezi kumi na miwili."],
  core3000_0045: ["kuchukua", "Tafadhali chukua mfuko huu."],
  core3000_0046: ["vizuri", "Anasoma vizuri."],
  core3000_0047: ["sana", "Chumba hiki ni kidogo sana."],
  core3000_0048: ["tu; sasa hivi", "Nahitaji maji tu."],
  core3000_0049: ["kuja", "Tafadhali njoo hapa."],
  core3000_0050: ["kufanya kazi", "Ninafanya kazi katika shule."],
  core3000_0051: ["kutumia", "Ninatumia simu hii kila siku."],
  core3000_0052: ["kisha", "Kula kiamsha kinywa, kisha nenda shuleni."],
  core3000_0053: ["pia", "Ninazungumza Kiingereza pia."],
  core3000_0054: ["tu", "Nina kalamu moja tu."],
  core3000_0055: ["kuangalia", "Angalia ubao."],
  core3000_0056: ["kutaka", "Ninataka kitabu kipya."],
  core3000_0057: ["kupa", "Tafadhali nipe kalamu."],
  core3000_0058: ["kwanza", "Hii ni siku yangu ya kwanza."],
  core3000_0059: ["mpya; kipya", "Nina simu mpya."],
  core3000_0060: ["njia", "Hii ni njia nzuri ya kujifunza."],
  core3000_0061: ["kupata; kutafuta", "Ninazipata funguo zangu juu ya meza."],
  core3000_0062: ["siku", "Siku inaweza kuwa na shughuli nyingi."],
  core3000_0063: ["kitu", "Kitu hiki kina manufaa."],
  core3000_0064: ["sahihi; kulia", "Jibu lako ni sahihi."],
  core3000_0065: ["vipi; jinsi", "Jina lako linaandikwaje?"],
  core3000_0066: ["nyuma; kurudi", "Tafadhali rudi hivi karibuni."],
  core3000_0067: ["kumaanisha", "Neno hili linamaanisha nini?"],
  core3000_0068: ["hata", "Hata mtoto anaweza kufanya hili."],
  core3000_0069: ["hapa", "Tafadhali kaa hapa."],
  core3000_0070: ["mtoto", "Mtoto anacheza nje."],
  core3000_0071: ["kusema; kumwambia", "Tafadhali niambie jina lako."],
  core3000_0072: ["kweli", "Ninakipenda sana kitabu hiki."],
  core3000_0073: ["kupiga simu", "Ninampigia mama yangu simu kila siku."],
  core3000_0074: ["kampuni", "Kampuni inauza simu hizi."],
  core3000_0075: ["kuonyesha", "Tafadhali nionyeshe ramani."],
  core3000_0076: ["maisha", "Maisha ni tofauti hapa."],
  core3000_0077: ["mwanamume", "Mwanamume anasubiri nje."],
  core3000_0078: ["kubadilika; kubadilisha", "Mipango hubadilika haraka."],
  core3000_0079: ["mahali", "Mahali hapa ni patulivu."],
  core3000_0080: ["ndefu", "Hii ni barabara ndefu."],
  core3000_0081: ["kuhisi", "Ninahisi furaha leo."],
  core3000_0082: ["mno", "Mfuko huu ni mzito mno."],
  core3000_0083: ["bado", "Bado ninaishi hapa."],
  core3000_0084: ["tatizo", "Hili ni tatizo dogo."],
  core3000_0085: ["kuandika", "Tafadhali andika jina lako."],
  core3000_0086: ["bora; nzuri sana", "Hili ni wazo zuri sana."],
  core3000_0087: ["kujaribu", "Ninajaribu kujifunza kila siku."],
  core3000_0088: ["kuondoka", "Tunaondoka saa mbili."],
  core3000_0089: ["nambari; idadi", "Andika nambari hapa."],
  core3000_0090: ["sehemu", "Sehemu hii ni muhimu."],
  core3000_0091: ["hoja; nukta", "Hoja hii iko wazi."],
  core3000_0092: ["kusaidia", "Ninamsaidia rafiki yangu."],
  core3000_0093: ["kuuliza", "Tafadhali uliza swali."],
  core3000_0094: ["kukutana", "Tunakutana shuleni."],
  core3000_0095: ["kuanza", "Masomo yanaanza saa tatu asubuhi."],
  core3000_0096: ["kuzungumza", "Ninazungumza na mwalimu wangu."],
  core3000_0097: ["kuweka", "Weka kitabu juu ya meza."],
  core3000_0098: ["kuwa", "Ninataka kuwa mwalimu."],
  core3000_0099: ["hamu; shauku", "Ana shauku ya muziki."],
  core3000_0100: ["nchi", "Kanada ni nchi kubwa."],
  core3000_0101: ["zamani; mzee", "Hii ni nyumba ya zamani."],
  core3000_0102: ["shule", "Kuna shule karibu na nyumba yangu."],
  core3000_0103: ["kuchelewa", "Nimechelewa darasani."],
  core3000_0104: ["juu; refu", "Ukuta ni mrefu."],
  core3000_0105: ["tofauti", "Vitabu hivi viwili ni tofauti."],
  core3000_0106: ["mwisho", "Mwisho wa hadithi ni wa huzuni."],
  core3000_0107: ["kuishi", "Ninaishi katika mji mdogo."],
  core3000_0108: ["kwa nini", "Kwa nini uko hapa?"],
  core3000_0109: ["dunia", "Watu wanaishi kote duniani."],
  core3000_0110: ["wiki", "Wiki ina siku saba."],
  core3000_0111: ["kucheza", "Watoto wanacheza bustanini."],
  core3000_0112: ["nyumbani", "Ninaenda nyumbani baada ya kazi."],
  core3000_0113: ["kamwe; katu", "Sili nyama kamwe."],
  core3000_0114: ["kujumuisha", "Bei hii inaweza kujumuisha kiamsha kinywa."],
  core3000_0115: ["kozi", "Kozi hii inaanza leo."],
  core3000_0116: ["nyumba", "Kuna nyumba karibu na shule."],
  core3000_0117: ["ripoti", "Ripoti ni fupi."],
  core3000_0118: ["kikundi", "Kikundi cha wanafunzi kinasubiri."],
  core3000_0119: ["hali; kesi", "Hali hii ni tofauti."],
  core3000_0120: ["mwanamke", "Mwanamke anasubiri nje."],
  core3000_0121: ["kitabu", "Kitabu hiki ni kipya."],
  core3000_0122: ["familia", "Familia yangu iko nyumbani."],
  core3000_0123: ["kuonekana", "Unaonekana umechoka."],
  core3000_0124: ["kuruhusu", "Tafadhali niruhusu nikusaidie."],
  core3000_0125: ["tena", "Tafadhali sema hilo tena."],
  core3000_0126: ["aina", "Aina hii ya chai ni nzuri."],
  core3000_0127: ["kuweka; kuhifadhi", "Weka simu yako hapa."],
  core3000_0128: ["kusikia", "Ninasikia muziki nje."],
  core3000_0129: ["mfumo", "Mfumo huu ni rahisi."],
  core3000_0130: ["swali", "Uliza swali sasa."],
  core3000_0131: ["daima; kila wakati", "Yeye huja mapema kila wakati."],
  core3000_0132: ["kubwa", "Hiki ni chumba kikubwa."],
  core3000_0133: ["seti", "Seti hii ina vikombe sita."],
  core3000_0134: ["ndogo; kidogo", "Hiki ni chumba kidogo."],
  core3000_0135: ["kusoma; kujifunza", "Ninasoma Kiingereza kila siku."],
  core3000_0136: ["kufuata", "Tafadhali mfuate mwalimu."],
  core3000_0137: ["kuanza", "Darasa linaweza kuanza sasa."],
  core3000_0138: ["muhimu", "Swali hili ni muhimu."],
  core3000_0139: ["kukimbia", "Ninakimbia bustanini."],
  core3000_0140: ["kugeuka", "Geuka kushoto karibu na mlango."],
  core3000_0141: ["kuleta", "Tafadhali leta kitabu chako."],
  core3000_0142: ["mapema", "Tunahitaji kuanza mapema."],
  core3000_0143: ["mkono", "Inua mkono wako."],
  core3000_0144: ["jimbo", "Kalifornia ni jimbo kubwa."],
  core3000_0145: ["kusogeza", "Tafadhali sogeza kiti."],
  core3000_0146: ["pesa", "Nahitaji pesa kwa chakula cha mchana."],
  core3000_0147: ["ukweli", "Ukweli huu ni muhimu."],
  core3000_0148: ["hata hivyo", "Kumechelewa; hata hivyo, tunaweza kusubiri."],
  core3000_0149: ["eneo", "Eneo hili ni tulivu."],
  core3000_0150: ["kutoa; kupatia", "Shule inaweza kutoa chakula cha mchana."],
};

const ptBrOverrides = {
  core3000_0004: ["de", "Uma xícara de chá está quente."],
  core3000_0007: ["em; dentro de", "A chave está na bolsa."],
  core3000_0008: ["ter", "Tenho um celular."],
  core3000_0009: ["ele; ela; isso", "Está na bolsa."],
  core3000_0010: ["você; vocês", "Você é meu amigo."],
  core3000_0012: ["para", "Este presente é para você."],
  core3000_0017: ["em; sobre", "A xícara está na mesa."],
  core3000_0018: ["com", "Estou com minha família."],
  core3000_0021: ["fazer", "Faço minha lição de casa."],
  core3000_0023: ["em; no; na", "Encontre-me na escola."],
  core3000_0027: ["por; perto de", "A bolsa está perto da porta."],
  core3000_0028: ["futuro com vou + infinitivo", "Vou ligar para você."],
  core3000_0030: ["dizer", "Por favor, diga seu nome."],
  core3000_0034: ["ali; lá", "Coloque a bolsa ali."],
  core3000_0037: ["pensar; achar", "Acho que isso está certo."],
  core3000_0041: ["fora", "Por favor, saia agora."],
  core3000_0045: ["pegar; levar", "Por favor, pegue esta bolsa."],
  core3000_0049: ["vir", "Por favor, venha aqui."],
  core3000_0050: ["trabalhar", "Trabalho em uma escola."],
  core3000_0051: ["usar", "Uso este celular todos os dias."],
  core3000_0052: ["então; depois", "Tome café da manhã, depois vá para a escola."],
  core3000_0055: ["olhar", "Olhe para o quadro."],
  core3000_0057: ["dar", "Por favor, me dê a caneta."],
  core3000_0059: ["novo; nova", "Tenho um celular novo."],
  core3000_0061: ["encontrar", "Encontro minhas chaves na mesa."],
  core3000_0064: ["certo; direita", "Sua resposta está certa."],
  core3000_0065: ["como", "Como se escreve seu nome?"],
  core3000_0066: ["de volta; para trás", "Por favor, volte em breve."],
  core3000_0068: ["até; mesmo", "Até uma criança consegue fazer isso."],
  core3000_0069: ["aqui", "Por favor, sente-se aqui."],
  core3000_0070: ["criança", "A criança está brincando lá fora."],
  core3000_0071: ["contar; dizer", "Por favor, me diga seu nome."],
  core3000_0072: ["realmente; mesmo", "Eu realmente gosto deste livro."],
  core3000_0073: ["telefonar; ligar", "Ligo para minha mãe todos os dias."],
  core3000_0074: ["empresa", "A empresa vende estes celulares."],
  core3000_0075: ["mostrar", "Por favor, me mostre o mapa."],
  core3000_0077: ["o homem", "Um homem está esperando lá fora."],
  core3000_0079: ["o lugar", "Este lugar é tranquilo."],
  core3000_0081: ["sentir-se", "Hoje me sinto feliz."],
  core3000_0082: ["demais; também", "Esta bolsa é pesada demais."],
  core3000_0084: ["problema", "Este é um problema pequeno."],
  core3000_0085: ["escrever", "Por favor, escreva seu nome."],
  core3000_0089: ["o número", "Escreva o número aqui."],
  core3000_0092: ["ajudar", "Ajudo meu amigo."],
  core3000_0093: ["perguntar; pedir", "Por favor, faça uma pergunta."],
  core3000_0094: ["encontrar-se", "Nós nos encontramos na escola."],
  core3000_0096: ["falar", "Falo com meu professor."],
  core3000_0097: ["colocar; pôr", "Coloque o livro na mesa."],
  core3000_0107: ["viver; morar", "Moro em uma cidade pequena."],
  core3000_0108: ["por que; por quê", "Por que você está aqui?"],
  core3000_0114: ["incluir", "Este preço pode incluir café da manhã."],
  core3000_0118: ["o grupo", "Um grupo de alunos está esperando."],
  core3000_0120: ["a mulher", "Uma mulher está esperando lá fora."],
  core3000_0122: ["a família", "Minha família está em casa."],
  core3000_0123: ["parecer", "Você parece cansado."],
  core3000_0124: ["deixar; permitir", "Por favor, deixe-me ajudar."],
  core3000_0125: ["de novo; novamente", "Por favor, diga isso de novo."],
  core3000_0127: ["manter; guardar", "Deixe seu celular aqui."],
  core3000_0128: ["ouvir", "Ouço música lá fora."],
  core3000_0130: ["a pergunta", "Faça uma pergunta agora."],
  core3000_0131: ["sempre", "Ela sempre chega cedo."],
  core3000_0133: ["conjunto; jogo", "Este conjunto tem seis xícaras."],
  core3000_0136: ["seguir", "Por favor, siga o professor."],
  core3000_0140: ["virar", "Vire à esquerda ao chegar à porta."],
  core3000_0141: ["trazer", "Por favor, traga seu livro."],
  core3000_0142: ["cedo; antecipado", "Precisamos começar cedo."],
  core3000_0143: ["a mão", "Levante a mão."],
  core3000_0145: ["mover", "Por favor, mova a cadeira."],
  core3000_0147: ["fato", "Este fato é importante."],
  core3000_0149: ["a área; a zona", "Esta área é tranquila."],
  core3000_0150: ["fornecer; disponibilizar", "A escola pode oferecer almoço."],
};

const es419Overrides = {
  core3000_0023: ["en; a", "Nos vemos en la escuela."],
  core3000_0027: ["cerca de; junto a", "La bolsa está cerca de la puerta."],
  core3000_0029: ["o", "Está bien té o café."],
  core3000_0045: ["tomar; agarrar", "Por favor, toma esta bolsa."],
  core3000_0150: ["proveer; ofrecer", "La escuela puede ofrecer el almuerzo."],
};

function requiredPair(table, coreItemId, language) {
  const pair = table[coreItemId];
  if (!pair) {
    throw new Error(`Missing ${language} translation for ${coreItemId}`);
  }
  return pair;
}

function pairFromBase(row, language) {
  const display = row[language];
  const example = row[`example_${language}`];
  if (!display || !example) {
    throw new Error(`Missing base ${language} values for ${row.core_item_id}`);
  }
  return [display, example];
}

const outputs = sourceRows.map((sourceRow) => {
  const coreItemId = sourceRow.core_item_id;
  const [swDisplay, swExample] = requiredPair(sw, coreItemId, "SW");
  const esBase = esRowsById.get(coreItemId);
  const ptBase = ptRowsById.get(coreItemId);
  if (!esBase) throw new Error(`Missing ES base row for ${coreItemId}`);
  if (!ptBase) throw new Error(`Missing PT base row for ${coreItemId}`);

  const [ptBrDisplay, ptBrExample] = ptBrOverrides[coreItemId] ?? pairFromBase(ptBase, "PT");
  const [es419Display, es419Example] = es419Overrides[coreItemId] ?? pairFromBase(esBase, "ES");

  return {
    release_id: releaseId,
    course_id: sourceRow.course_id,
    row_id: sourceRow.row_id,
    core_item_id: coreItemId,
    meaning_id: sourceRow.meaning_id,
    source_headword: sourceRow.source_headword,
    part_of_speech: sourceRow.part_of_speech,
    en_display: sourceRow.en_display,
    example_EN: sourceRow.example_EN,
    translation_batch: batchId,
    translation_status: "draft_native_style_qa_v3_checked",
    source_note:
      "Internal LunaCards draft translation layer; native-style QA v2/v3 checked, final QA and source-assisted checks still required before delivery.",
    SW: swDisplay,
    example_SW: swExample,
    "PT-BR": ptBrDisplay,
    "example_PT-BR": ptBrExample,
    "ES-419": es419Display,
    "example_ES-419": es419Example,
    qa_notes:
      "Target-language text only. EN-US remains the source language with IPA; SW/PT-BR/ES-419 have no transcription fields. PT-BR is a regional layer over checked PT with Brazil-specific overrides; ES-419 is a regional layer over checked ES with Latin America vocabulary checks.",
  };
});

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(outputPath, `${outputs.map((row) => JSON.stringify(row)).join("\n")}\n`);

const statusCounts = outputs.reduce((acc, row) => {
  acc[row.translation_status] = (acc[row.translation_status] ?? 0) + 1;
  return acc;
}, {});

const summary = `# English Core 3000 Translation Batch: SW/PT-BR/ES-419

- Release: \`${releaseId}\`
- Batch: \`${batchId}\`
- Rows: ${outputs.length}
- Output: \`${path.relative(process.cwd(), outputPath)}\`
- Status counts: ${Object.entries(statusCounts)
  .map(([status, count]) => `${status}: ${count}`)
  .join(", ")}

## Scope

- Adds Swahili, Brazilian Portuguese, and Latin American Spanish translations/examples for the first 150 English Core 3000 rows.
- Target-language fields are text only: \`SW\`, \`example_SW\`, \`PT-BR\`, \`example_PT-BR\`, \`ES-419\`, \`example_ES-419\`.
- No target-language transcriptions are emitted. Only EN-US word/example transcription fields are in scope for this course.
- \`PT-BR\` inherits the checked \`PT\` batch where neutral and applies Brazil-specific overrides for cells such as \`celular\`, \`xícara\`, \`café da manhã\`, and \`você\` forms.
- \`ES-419\` inherits the checked \`ES\` batch where neutral and applies Latin America vocabulary checks, avoiding Spain-only forms such as \`coger\`.

## QA Expectation

- Run deterministic batch shape checks before export.
- Native-style QA should verify Swahili noun class agreement and idiomatic beginner examples, Brazilian Portuguese register, and Latin American Spanish regional neutrality.
`;

await fs.writeFile(summaryPath, summary);

console.log(`Wrote ${outputs.length} rows to ${outputPath}`);
console.log(`Wrote summary to ${summaryPath}`);
