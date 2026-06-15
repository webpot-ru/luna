#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "PT";
const BATCH_ID = "pt_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-pt.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const PT_TRANSLATIONS_TSV = `source_headword	PT	example_PT
clothes	a roupa	A minha roupa está limpa.
club	o clube	Ela vai a um clube de música.
coat	o casaco	O meu casaco é quente.
coffee	o café	Bebo café de manhã.
cold	frio; o frio	A água está fria.
college	a faculdade	A minha irmã estuda na faculdade.
colour	a cor	A minha cor preferida é azul.
come	vir	Vem aqui, por favor.
common	comum	Este nome é comum.
company	a empresa	A minha mãe trabalha numa empresa.
compare	comparar	Compara estas duas imagens.
complete	completo; completar	O formulário está completo.
computer	o computador	Este computador é novo.
concert	o concerto	Vamos a um concerto esta noite.
conversation	a conversa	Tivemos uma conversa curta.
cook	cozinhar; o cozinheiro	Cozinho o jantar em casa.
cooking	a cozinha; cozinhar	Gosto de cozinhar com o meu pai.
cool	fresco; fixe	O quarto está fresco.
correct	correto; corrigir	A tua resposta está correta.
cost	custar; o custo	Quanto custa isto?
could modal	poderia	Eu poderia ajudar-te.
country	o país	O Canadá é um país grande.
course	o curso	Estou a fazer um curso de inglês.
cousin	o primo/a prima	O meu primo vive perto.
cow	a vaca	A vaca come erva.
cream	as natas; o creme	Ponho natas no café.
create	criar	Eles criam um jogo novo.
culture	a cultura	Estudamos a cultura local.
cup	a chávena	Esta chávena está vazia.
customer	o cliente/a cliente	O cliente faz uma pergunta.
cut	cortar	Corta a maçã ao meio.
dad	o pai	O pai está no trabalho.
dance	a dança; dançar	Dançamos depois do jantar.
dancer	o dançarino/a dançarina	O dançarino mexe-se depressa.
dancing	a dança	Dançar é divertido.
dangerous	perigoso	Esta estrada é perigosa.
dark	escuro	O quarto está escuro.
date	a data	Qual é a data de hoje?
daughter	a filha	A filha dela tem seis anos.
day	o dia	Tem um bom dia.
dear	caro	Caro amigo, obrigado.
December	dezembro	O meu aniversário é em dezembro.
decide	decidir	Decide agora, por favor.
delicious	delicioso	Esta sopa está deliciosa.
describe	descrever	Descreve o teu quarto.
description	a descrição	Lê a descrição curta.
design	o design; desenhar	Faço um design simples para o cartão.
desk	a secretária	O livro está na minha secretária.
detail	o detalhe	Falta um detalhe.
dialogue	o diálogo	Lê o diálogo agora.
dictionary	o dicionário	Usa um dicionário na aula.
die	morrer	As flores morrem sem água.
diet	a alimentação; a dieta	A minha alimentação inclui fruta.
difference	a diferença	Há uma diferença.
different	diferente	Temos nomes diferentes.
difficult	difícil	Esta pergunta é difícil.
dinner	o jantar	O jantar está pronto.
dirty	sujo	Os meus sapatos estão sujos.
discuss	discutir	Discutimos o plano.
dish	o prato	Este prato está quente.
do1	fazer	O que estás a fazer?
doctor	o médico/a médica	O médico está ocupado.
dog	o cão	O cão corre lá fora.
dollar	o dólar	Isto custa um dólar.
door	a porta	Fecha a porta, por favor.
down	baixo; para baixo	Senta-te aqui em baixo.
downstairs	em baixo; no rés do chão	A cozinha fica em baixo.
draw	desenhar	Desenha uma casa pequena.
dress	o vestido; vestir-se	Ela usa um vestido vermelho.
drink	a bebida; beber	Bebo água.
drive	conduzir	Conduzo para o trabalho.
driver	o condutor/a condutora	O condutor para aqui.
during	durante	Durmo durante o voo.
DVD	o DVD	Este DVD é velho.
each	cada	Cada criança tem um livro.
ear	a orelha	Dói-me a orelha.
early	cedo; inicial	Levanto-me cedo.
east	o leste	O sol nasce a leste.
easy	fácil	Este teste é fácil.
eat	comer	Comemos juntos.
egg	o ovo	Como um ovo.
eight	oito	Tenho oito cartões.
eighteen	dezoito	Ela tem dezoito anos.
eighty	oitenta	O meu avô tem oitenta anos.
elephant	o elefante	O elefante é grande.
eleven	onze	A aula começa às onze.
else	outro; mais	De que mais precisas?
email	o e-mail	Envia-me um e-mail.
end	o fim; acabar	Este é o fim.
enjoy	gostar; desfrutar	Gosto desta canção.
enough	suficiente	Temos tempo suficiente.
euro	o euro	Isto custa um euro.
even	até	Até o meu irmão sabe.
evening	a noite	Vemo-nos esta noite.
event	o evento	O evento começa hoje.
ever	alguma vez	Alguma vez cozinhas?
every	cada	Estudo todos os dias.
everybody	toda a gente	Toda a gente está aqui.
everyone	todos; toda a gente	Toda a gente gosta de música.
everything	tudo	Tudo está pronto.
exam	o exame	O exame começa em breve.
example	o exemplo	Este é um bom exemplo.
excited	entusiasmado	Estou entusiasmado hoje.
exciting	entusiasmante	O jogo é entusiasmante.
exercise	o exercício; fazer exercício	Faço exercício antes do pequeno-almoço.
expensive	caro	Este casaco é caro.
explain	explicar	Explica esta palavra, por favor.
extra	extra; adicional	Preciso de tempo extra.
eye	o olho	Tenho o olho vermelho.
face	a cara	Lava a cara.
fact	o facto	Este facto é importante.
fall	cair; o outono	As folhas caem no outono.
false	falso	Esta resposta é falsa.
family	a família	A minha família é pequena.
famous	famoso	Ela é uma cantora famosa.
fantastic	fantástico	O concerto foi fantástico.
far	longe; distante	A escola fica longe.
farm	a quinta	Eles vivem numa quinta.
farmer	o agricultor/a agricultora	O agricultor cultiva comida.
fast	rápido	Este comboio é rápido.
fat	gordo	O gato é gordo.
father	o pai	O meu pai é alto.
favourite	preferido	Esta é a minha canção preferida.
February	fevereiro	Fevereiro é frio aqui.
feel	sentir; sentir-se	Sinto-me feliz.
feeling	o sentimento	Conheço esse sentimento.
festival	o festival	O festival começa amanhã.
few	poucos; alguns	Há poucos alunos aqui.
fifteen	quinze	Tenho quinze anos.
fifth	quinto	Esta é a quinta aula.
fifty	cinquenta	A minha mãe tem cinquenta anos.
fill	encher; preencher	Enche a chávena com água.
film	o filme	Vemos um filme.
final	final; último	Esta é a última pergunta.
find	encontrar	Encontro as chaves.
fine	bem; bom	Agora estou bem.
finish	acabar	Acaba os trabalhos de casa.
fire	o fogo; o incêndio	O fogo está quente.
first	primeiro	Ela é a primeira na fila.
fish	o peixe	Como peixe ao jantar.
five	cinco	Tenho cinco livros.
flat	o apartamento	O meu apartamento é pequeno.
flight	o voo	O voo está atrasado.
floor	o chão; o piso	O saco está no chão.
flower	a flor	Esta flor é amarela.
fly	voar	Os pássaros voam no céu.
follow	seguir	Segue-me, por favor.
food	a comida	A comida está pronta.
foot	o pé	Dói-me o pé.
football	o futebol	Jogamos futebol hoje.
for	para	Este presente é para ti.
forget	esquecer	Não te esqueças das chaves.
form	o formulário	Preenche o formulário.
forty	quarenta	O meu pai tem quarenta anos.
four	quatro	Vejo quatro pássaros.
fourteen	catorze	Ela tem catorze anos.
fourth	quarto	Este é o quarto piso.
free	grátis; livre	O bilhete é grátis.
Friday	sexta-feira	Vemo-nos na sexta-feira.
friend	o amigo/a amiga	O meu amigo está aqui.
friendly	amigável	O professor é amigável.
from	de; desde	Sou daqui.
front	a frente; à frente	Fica à frente.
fruit	a fruta	Como fruta todos os dias.
full	cheio	A garrafa está cheia.
fun	a diversão; divertido	Este jogo é divertido.
funny	engraçado	O filme é engraçado.
future	o futuro	Pensa no teu futuro.
game	o jogo	O jogo começa agora.
garden	o jardim	O jardim é bonito.
geography	a geografia	Estudo geografia na escola.
get	obter; chegar	Chego a casa às seis.
girl	a rapariga; a menina	A rapariga sorri.
girlfriend	a namorada	A namorada dele é simpática.
give	dar	Dá-me o livro.
glass	o copo; o vidro	Bebo de um copo.
go	ir	Vamos para casa agora.
good	bom	Este café é bom.
goodbye	adeus	Adeus, até amanhã.
grandfather	o avô	O meu avô é velho.
grandmother	a avó	A minha avó faz sopa.
grandparent	o avô/a avó	Um dos meus avós vive connosco.
great	ótimo; grande	É uma ótima ideia.
green	verde	A porta é verde.
grey	cinzento	O céu está cinzento.
group	o grupo	Trabalhem num grupo pequeno.
grow	crescer; cultivar	As plantas crescem no jardim.
guess	adivinhar; o palpite	Adivinha a resposta.
guitar	a guitarra	Ele toca guitarra.
gym	o ginásio	Vou ao ginásio.
hair	o cabelo	Ela tem cabelo comprido.
half	a metade	Corta o bolo ao meio.
hand	a mão	Levanta a mão.
happen	acontecer	O que acontece a seguir?
happy	feliz	Estou feliz hoje.
hard	duro; difícil	Esta cadeira é dura.
hat	o chapéu; o gorro	O meu gorro é preto.
hate	odiar	Odeio chá frio.
have	ter	Tenho um carro.
have to modal	ter de	Tenho de estudar.
he	ele	Ele é o meu irmão.
head	a cabeça	Dói-me a cabeça.
health	a saúde	A boa comida ajuda a saúde.
healthy	saudável	Este prato é saudável.
hear	ouvir	Ouço música.
hello	olá	Olá, prazer em conhecer-te.
help	a ajuda; ajudar	Ajuda-me, por favor.
her	dela; a; lhe	Esta é a mala dela.
here	aqui	Vem aqui agora.
hey	olá; ei	Ei, espera por mim.
hi	olá	Olá, como estás?
high	alto	A parede é alta.
him	ele; o; lhe	Eu conheço-o.
his	dele	O casaco dele é azul.
history	a história	Estudo história.
hobby	o passatempo	Ler é o meu passatempo.
holiday	as férias	Vamos de férias em julho.
home	a casa; em casa	Estou em casa.
homework	os trabalhos de casa	Faz os trabalhos de casa esta noite.
hope	esperar	Espero que venhas.
horse	o cavalo	O cavalo corre depressa.
hospital	o hospital	O hospital fica perto.
hot	quente	A sopa está quente.
hotel	o hotel	O hotel está limpo.
hour	a hora	Espera uma hora.
house	a casa	Esta casa é velha.
how	como	Como estás?
however	no entanto	No entanto, posso ficar aqui.
hundred	cem	Vieram cem pessoas.
hungry	com fome	Tenho fome.
husband	o marido	O marido dela é médico.
I	eu	Adoro chá.
ice	o gelo	O gelo está frio.
ice cream	o gelado	Quero um gelado.
idea	a ideia	É uma boa ideia.
if	se	Liga-me se precisares de ajuda.
imagine	imaginar	Imagina uma casa pequena.
important	importante	Esta aula é importante.
improve	melhorar	Quero melhorar.
in	em; dentro de	As chaves estão na minha mala.
include	incluir	Inclui o teu nome, por favor.
information	a informação	Preciso de mais informação.
interest	o interesse	Ela interessa-se por arte.
interested	interessado	Estou interessado em música.
interesting	interessante	Este livro é interessante.
internet	a internet	A internet está lenta.
interview	a entrevista	Hoje tenho uma entrevista.
into	em; para dentro	Põe os livros na mala.
introduce	apresentar	Apresenta o teu amigo, por favor.
island	a ilha	Esta ilha é pequena.
it	isso; ele; ela	Está frio.
its	seu; sua	O cão gosta da sua cama.
jacket	o casaco	O meu casaco é novo.
January	janeiro	Janeiro é o primeiro mês.
jeans	as calças de ganga	As minhas calças de ganga são azuis.
job	o trabalho	Preciso de um trabalho novo.
join	juntar-se	Junta-te à nossa aula hoje.
journey	a viagem	A viagem é longa.
juice	o sumo	Bebo sumo de laranja.
July	julho	Viajamos em julho.
June	junho	A escola acaba em junho.
just	apenas; só	Só preciso de água.
keep	guardar; manter	Guarda esta chave.
key	a chave	Perdi a chave.
kilometre	o quilómetro	Anda um quilómetro.
kind (type)	o tipo	Que tipo de música gostas?
kitchen	a cozinha	A cozinha está limpa.
know	saber; conhecer	Sei a resposta.
land	a terra; o solo	O avião está no solo.
language	a língua; o idioma	O inglês é uma língua.
large	grande	Esta divisão é grande.
last1 (final)	último	Esta é a última página.
late	tarde; atrasado	O autocarro está atrasado.
later	mais tarde	Até mais tarde.
laugh	rir; o riso	Rimos juntos.
learn	aprender	Aprendo inglês.
leave	sair; deixar	Deixa a porta aberta.
left	esquerdo; à esquerda	Vira aqui à esquerda.
leg	a perna	Dói-me a perna.
lesson	a aula; a lição	A aula começa agora.
let	deixar; permitir	Deixa-me ajudar-te.
letter	a carta; a letra	Escrevo uma carta.
library	a biblioteca	A biblioteca abre às nove.
lie1	deitar-se	Deita-te na cama, por favor.
life	a vida	A vida na cidade é animada.
like (similar)	como; parecido com	Isto parece um jogo.
like (find sb/sth pleasant)	gostar	Gosto desta canção.
line	a linha; a fila	Fica na fila.
lion	o leão	O leão dorme.
list	a lista; fazer uma lista	Faz uma lista de compras.
listen	ouvir	Ouça o professor.
little	pequeno; pouco	Tenho pouco dinheiro.
live1	viver	Moro perto da escola.
local	local	Esta é uma loja local.
long1	longo	O caminho é longo.
look	olhar; parecer	Olha para a imagem.
lose	perder	Não percas o bilhete.
lot	muito; um monte	Tenho muitos trabalhos de casa.
love	o amor; amar	Amo a minha família.
lunch	o almoço	O almoço está pronto.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_002_300_v1_contract_v0.json",
    examples: "",
    outDir: "outputs/oxford-vocabulary/support-translations",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }
    index += 1;
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
    reviewer: "codex_oxford_part002_support_translation_batch_pt_v1",
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate the next support-language batch in language order.",
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
    `# Oxford Part 002 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
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
