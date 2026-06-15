#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "PT";
const BATCH_ID = "pt_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part004-support-translation-batch-pt.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const PT_TRANSLATIONS_TSV = `source_headword	PT	example_PT
take	tomar; levar	Leva o bilhete.
talk	falar; a conversa	Falamos depois da aula.
tall	alto; alta	O meu professor é alto.
taxi	o táxi	O táxi está lá fora.
tea	o chá	Este chá está quente.
teach	ensinar	Ensino inglês.
teacher	o professor; a professora	A professora sorri.
team	a equipa	A nossa equipa ganha hoje.
teenager	o adolescente; a adolescente	O adolescente lê um livro.
telephone	o telefone; telefonar	O telefone está na secretária.
television	a televisão; o televisor	A televisão é nova.
tell	dizer; contar	Diz-me o teu nome.
ten	dez	Tenho dez livros.
tennis	o ténis	Jogamos ténis hoje.
terrible	terrível	O tempo está terrível.
test	o teste; o exame; testar	O teste começa agora.
text	a mensagem; enviar uma mensagem	Envia uma mensagem curta.
than	do que; que	Dez é mais do que dois.
thank	agradecer	Agradece ao teu professor.
thanks	obrigado; obrigada	Obrigado pela tua ajuda.
that	esse; essa; aquele; aquilo	Esse livro é meu.
the	o; a; os; as	O chá está quente.
theatre	o teatro	O teatro fica perto da estação.
their	o seu; a sua; os seus; as suas	A casa deles é grande.
them	os; as; lhes	Eu conheço-os.
then	então; depois	Come e depois estuda.
there	lá; ali; há	Há uma cadeira ali.
they	eles; elas	Eles estão na escola.
thing	a coisa; o objeto	Esta coisa é útil.
think	pensar	Penso em casa.
third	terceiro; terceira; o terço	Esta é a terceira aula.
thirsty	com sede	Tenho sede.
thirteen	treze	Ela tem treze anos.
thirty	trinta	A minha irmã tem trinta anos.
this	este; esta	Este bilhete é novo.
thousand	mil	Vieram mil pessoas.
three	três	Vejo três pássaros.
through	por; através de	Caminhamos pelo parque.
Thursday	quinta-feira	Vemo-nos na quinta-feira.
ticket	o bilhete; a entrada	Preciso de um bilhete.
time	o tempo; a hora	Que horas são?
tired	cansado; cansada	Estou cansado.
title	o título	Lê o título.
to	a; para; marcador de infinitivo	Vou para a aula.
today	hoje	Hoje está sol.
together	juntos; juntas	Comemos juntos.
toilet	a casa de banho; a sanita	A casa de banho está limpa.
tomato	o tomate	Este tomate é vermelho.
tomorrow	amanhã	Até amanhã.
tonight	esta noite	Estudamos esta noite.
too	também; demasiado	Também quero chá.
tooth	o dente	Dói-me um dente.
topic	o tema; o assunto	Escolhe um tema.
tourist	o turista; a turista	O turista tira fotografias.
town	a cidade; a vila	Esta vila é calma.
traffic	o trânsito	O trânsito está lento.
train	o comboio; treinar	O comboio chega atrasado.
travel	viajar; a viagem	Viajamos de comboio.
tree	a árvore	A árvore é alta.
trip	a viagem; a excursão	A viagem começa amanhã.
trousers	as calças	As minhas calças são pretas.
true	verdadeiro; certo	Essa história é verdadeira.
try	tentar; provar	Prova este chá.
T-shirt	a t-shirt	Visto uma t-shirt.
Tuesday	terça-feira	Vemo-nos na terça-feira.
turn	virar; a vez	Vira à esquerda aqui.
TV	a TV; a televisão	A TV está demasiado alta.
twelve	doze	Tenho doze canetas.
twenty	vinte	Há vinte estudantes aqui.
twice	duas vezes	Nado duas vezes por semana.
two	dois; duas	Duas pessoas esperam.
type	o tipo; escrever no teclado	Que tipo de música?
umbrella	o guarda-chuva	Leva um guarda-chuva.
uncle	o tio	O meu tio é simpático.
under	debaixo de; sob	A mala está debaixo da mesa.
understand	compreender; perceber	Compreendo a pergunta.
university	a universidade	A universidade fica perto.
until	até	Espera até às cinco.
up	em cima; para cima	Levanta-te agora.
upstairs	em cima; no andar de cima	O meu quarto fica em cima.
us	nos; nós	Ajuda-nos, por favor.
use	usar; o uso	Usa esta caneta.
useful	útil	Este mapa é útil.
usually	normalmente	Normalmente vou para casa a pé.
vacation	as férias	As nossas férias começam amanhã.
vegetable	o legume; a verdura	A cenoura é um legume.
very	muito	O quarto está muito calmo.
video	o vídeo	Vê este vídeo.
village	a aldeia; a vila	A aldeia é pequena.
visit	visitar; a visita	Visitamos a nossa tia.
visitor	o visitante; a visitante	O visitante espera lá fora.
wait	esperar	Espera aqui, por favor.
waiter	o empregado; a empregada	O empregado traz chá.
wake	acordar; despertar	Acordo cedo.
walk	andar; caminhar; a caminhada	Caminhamos para a escola.
wall	a parede	A parede é branca.
want	querer	Quero água.
warm	quente; morno; aquecer	O quarto está quente.
wash	lavar	Lava as mãos.
watch	ver; observar; o relógio	Vejo televisão.
water	a água; regar	Bebe um pouco de água.
way	o caminho; a maneira	Este caminho é curto.
we	nós	Estudamos inglês.
wear	vestir; usar	Visto um casaco.
weather	o tempo	O tempo está frio.
website	o site; a página web	Este site é útil.
Wednesday	quarta-feira	A aula começa na quarta-feira.
week	a semana	Esta semana está ocupada.
weekend	o fim de semana	O fim de semana começa amanhã.
welcome	bem-vindo; bem-vinda; acolher	Bem-vindo à nossa aula.
well	bem	Ela canta bem.
west	o oeste	O sol põe-se a oeste.
what	o quê; qual	O que é isto?
when	quando	Quando estudas?
where	onde	Onde fica a estação?
which	qual; quais	Qual mala é tua?
white	branco; branca	A parede é branca.
who	quem	Quem é?
why	porquê	Porque chegas tarde?
wife	a esposa; a mulher	A esposa dele é professora.
will modal	marcador de futuro; vou	Vou ajudar-te amanhã.
win	ganhar	A nossa equipa pode ganhar.
window	a janela	Abre a janela.
wine	o vinho	Este vinho é tinto.
winter	o inverno	O inverno é frio aqui.
with	com	Vem comigo.
without	sem	O chá sem açúcar está bom.
woman	a mulher	A mulher lê um livro.
wonderful	maravilhoso; maravilhosa	A vista é maravilhosa.
word	a palavra	Escreve uma palavra.
work	trabalhar; o trabalho	Trabalho em casa.
worker	o trabalhador; a trabalhadora	O trabalhador está ocupado.
world	o mundo	O mundo é grande.
would modal	condicional; gostaria	Gostaria de chá.
write	escrever	Escreve o teu nome.
writer	o escritor; a escritora	O escritor vive aqui.
writing	a escrita; o texto	A escrita dela é clara.
wrong	errado; incorreto	Esta resposta está errada.
yeah	sim; claro	Sim, posso vir.
year	o ano	Este ano é bom.
yellow	amarelo; amarela	A banana é amarela.
yes	sim	Sim, compreendo.
yesterday	ontem	Liguei ontem.
you	tu; você; vocês	Tu és meu amigo.
young	jovem	A criança é jovem.
your	teu; tua; seus; suas	A tua mala está aqui.
yourself	tu mesmo; você mesmo	Serve-te de chá.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_004_147_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const [key, inlineValue] = raw.split("=", 2);
    const value = inlineValue ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    if (inlineValue === undefined) index += 1;
    if (key === "--contract") args.contract = value;
    else if (key === "--examples") args.examples = value;
    else if (key === "--out-dir") args.outDir = value;
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\u00a0/gu, " ").replace(/\s+/gu, " ").trim();
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at ${filePath}:${index + 1}: ${error.message}`);
      }
    });
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function parseTranslations() {
  const lines = PT_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tPT\texample_PT") {
    throw new Error("Unexpected PT translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad PT translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad PT translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad PT example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate PT translation key: ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

function validateTranslationMap(rows, translations) {
  const sourceKeys = rows.map((row) => row.source_headword);
  const rowKeySet = new Set(sourceKeys);
  const missing = sourceKeys.filter((key) => !translations.has(key));
  const extra = [...translations.keys()].filter((key) => !rowKeySet.has(key));
  if (missing.length) {
    throw new Error(`Missing PT translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`PT translation map has unused rows: ${extra.join(", ")}`);
  }
}

function buildSupportRow(exampleRow, translation, generatedAt) {
  return {
    release_id: exampleRow.release_id,
    course_id: exampleRow.course_id,
    row_id: exampleRow.row_id,
    core_item_id: exampleRow.core_item_id,
    meaning_id: exampleRow.meaning_id,
    source_candidate_id: exampleRow.source_candidate_id,
    source_headword: exampleRow.source_headword,
    reviewed_display_headword: exampleRow.reviewed_display_headword,
    reviewed_part_of_speech: exampleRow.reviewed_part_of_speech,
    meaning_note: exampleRow.meaning_note,
    example_EN: exampleRow.example_EN,
    support_translation_batch: BATCH_ID,
    support_translation_status: "draft_native_style_needs_source_assisted_qa",
    support_example_status: "draft_scene_preserving_needs_source_assisted_qa",
    source_note:
      "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
    reviewer: "codex_oxford_part004_support_translation_batch_pt_article_display_v1",
    reviewed_at: generatedAt,
    generation_ready: false,
    remaining_blockers: (exampleRow.remaining_blockers ?? []).filter(
      (blocker) =>
        ![
          "english_pronunciation_source_check",
          "english_example_quality_check",
          "support_translation_meaning_check",
          "support_example_scene_check",
        ].includes(blocker)
    ),
    PT: translation.display,
    example_PT: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: batchPath,
    summary_path: summaryPath,
    languages: [LANGUAGE],
    rows: rows.length,
    display_cells: rows.length,
    example_cells: rows.length,
    target_language_transcriptions_included: false,
    article_display_included: true,
    closes_gate_layer: [],
    does_not_close: [
      "support_translation_meaning_check",
      "support_example_scene_check",
      "weak_language_targeted_review",
      "support_translation_sample_review",
      "support_translation_source_backed_audit",
      "support_example_quality_audit",
      "support_article_display_repair_check",
      "final_delivery_approval_check",
    ],
  };
  const existing = contract.latest_support_translation_batches ?? [];
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: ZH.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  return contract;
}

const args = parseArgs(process.argv.slice(2));
const contract = await readJson(args.contract);
const examplesPath = args.examples || contract.latest_english_examples?.path;
if (!examplesPath) {
  throw new Error("No examples path provided and contract.latest_english_examples.path is empty");
}
const exampleRows = await readJsonl(examplesPath);
if (!exampleRows.length) {
  throw new Error("English examples artifact is empty");
}
const translations = parseTranslations();
validateTranslationMap(exampleRows, translations);

const releaseId = exampleRows[0].release_id;
const generatedAt = new Date().toISOString();
const supportRows = exampleRows.map((row) => buildSupportRow(row, translations.get(row.source_headword), generatedAt));
const batchPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}.jsonl`);
const summaryPath = path.join(args.outDir, `${releaseId}_support_translation_batch_${BATCH_ID}_summary.md`);
await writeJsonl(batchPath, supportRows);
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(
  summaryPath,
  [
    `# Oxford Part 004 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: included in Portuguese display cells where grammatically useful",
    "- Translation status: `draft_native_style_needs_source_assisted_qa`",
    "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
    "- Target-language transcriptions: not included",
    "- Postgres import: false",
    "- Google Sheet delivery: false",
    "",
    "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
    "",
  ].join("\n"),
  "utf8"
);

const updatedContract = updateContract(contract, batchPath, summaryPath, supportRows);
await writeFile(args.contract, `${JSON.stringify(updatedContract, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      release_id: releaseId,
      batch_id: BATCH_ID,
      languages: [LANGUAGE],
      rows: supportRows.length,
      display_cells: supportRows.length,
      example_cells: supportRows.length,
      path: batchPath,
      contract_updated: args.contract,
    },
    null,
    2
  )
);
