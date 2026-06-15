#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "PT";
const BATCH_ID = "pt_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-pt.mjs";
const SENTENCE_END_RE = /[.!?]$/u;

const PT_TRANSLATIONS_TSV = `source_headword	PT	example_PT
machine	a máquina; o aparelho	Esta máquina faz café.
magazine	a revista	Ela lê uma revista de música.
main	principal	Esta é a porta principal.
make	fazer; preparar	Preparo o almoço em casa.
man	o homem	O homem é o meu professor.
many	muitos; muitas	Muitos estudantes estão aqui.
map	o mapa	Olha para o mapa.
March	março	O meu aniversário é em março.
market	o mercado	Compramos fruta no mercado.
married	casado; casada	A minha irmã é casada.
May	maio	A escola acaba em maio.
maybe	talvez	Talvez chova.
me	me; mim	Ajuda-me, por favor.
meal	a refeição	Esta refeição está quente.
mean	significar	O que significa este sinal?
meaning	o significado	Qual é o significado?
meat	a carne	Como carne ao jantar.
meet	encontrar; encontrar-se	Encontramo-nos depois da aula.
meeting	a reunião	A reunião começa agora.
member	o membro; o sócio	Ela é sócia do clube.
menu	o menu; a ementa	Lê a ementa, por favor.
message	a mensagem	Envio uma mensagem curta.
metre	o metro	Anda um metro para a frente.
midnight	a meia-noite	O comboio parte à meia-noite.
mile	a milha	Caminhamos uma milha.
milk	o leite	Bebo leite ao pequeno-almoço.
million	o milhão	Um milhão de pessoas vive aqui.
minute1	o minuto	Espera um minuto, por favor.
miss	sentir falta; perder	Tenho saudades da minha antiga escola.
mistake	o erro	Esta resposta tem um erro.
model	o modelo	Este é um modelo pequeno.
modern	moderno	A cozinha é moderna.
moment	o momento	Espera um momento, por favor.
Monday	segunda-feira	Começamos a trabalhar na segunda-feira.
money	o dinheiro	Preciso de algum dinheiro.
month	o mês	Junho é um mês quente.
more	mais	Preciso de mais tempo.
morning	a manhã	Estudo de manhã.
most	a maioria; o mais	A maioria dos estudantes gosta de música.
mother	a mãe	A minha mãe trabalha hoje.
mountain	a montanha	A montanha é alta.
mouse	o rato	Um rato está debaixo da cadeira.
mouth	a boca	Abre a boca, por favor.
move	mover; deslocar	Move a cadeira para aqui.
movie	o filme	Vemos um filme esta noite.
much	muito; quanto	Quanto custa isto?
mum	a mãe; a mamã	A mamã está em casa.
museum	o museu	O museu abre às dez.
music	a música	Ouço música.
must modal	dever; ter de	Tens de parar aqui.
my	meu; minha; meus; minhas	Este é o meu livro.
name	o nome; chamar	Escreve o teu nome aqui.
natural	natural	Este sumo é natural.
near	perto; próximo	O banco fica perto daqui.
need	precisar de	Preciso de uma caneta.
negative	negativo	Esta resposta é negativa.
neighbour	o vizinho; a vizinha	O meu vizinho é simpático.
never	nunca	Nunca bebo café.
new	novo; nova	Este telemóvel é novo.
news	as notícias	As notícias são boas hoje.
newspaper	o jornal	Ele lê um jornal.
next	próximo; seguinte	O próximo autocarro está atrasado.
next to	ao lado de	Senta-te ao meu lado.
nice	agradável; simpático	O quarto é agradável.
night	a noite	Durmo à noite.
nine	nove	Nove estudantes estão aqui.
nineteen	dezanove	Ela tem dezanove anos.
ninety	noventa	O meu avô tem noventa anos.
no	não	Não, obrigado.
no one	ninguém	Ninguém está no quarto.
nobody	ninguém	Ninguém está em casa.
north	o norte	A estação fica a norte daqui.
nose	o nariz	O meu nariz está frio.
not	não	Não estou cansado.
note	a nota	Escreve uma nota agora.
nothing	nada	Não há nada na caixa.
November	novembro	O meu curso começa em novembro.
now	agora	Vem aqui agora.
number	o número	Escreve o número aqui.
nurse	o enfermeiro; a enfermeira	A enfermeira é simpática.
object	o objeto	Põe o objeto na mesa.
o’clock	horas; em ponto	A aula começa às nove.
October	outubro	Viajamos em outubro.
of	de	Esta é uma chávena de chá.
off	desligado; fora	Desliga a luz.
office	o escritório; o gabinete	O meu escritório é pequeno.
often	muitas vezes; frequentemente	Vou muitas vezes a pé para a escola.
oh	oh	Oh, agora percebo.
OK	ok; está bem	Está bem assim?
old	velho; antigo	Esta casa é velha.
on	em; sobre; ligado	O livro está na mesa.
once	uma vez	Ligo uma vez por semana.
one	um; uma	Tenho uma irmã.
onion	a cebola	Corta uma cebola.
online	online	Estudo online.
only	só; apenas	Tenho só uma mala.
open	abrir; aberto	Abre a janela, por favor.
opinion	a opinião	Qual é a tua opinião?
opposite	em frente de; oposto	A loja fica em frente do banco.
or	ou	Chá ou café?
orange	a laranja; cor de laranja	Esta laranja é doce.
order	pedir; encomendar; o pedido	Peço sopa.
other	outro; outra	Usa a outra porta.
our	nosso; nossa; nossos; nossas	Esta é a nossa sala de aula.
out	fora; para fora	Sai depois do almoço.
outside	fora; no exterior	As crianças brincam lá fora.
over	sobre; por cima	O avião voa sobre a cidade.
own	próprio; própria	Tenho o meu próprio quarto.
page	a página	Abre a página dez.
paint	pintar; a tinta	Pinta a parede de azul.
painting	a pintura; o quadro	Este quadro é bonito.
pair	o par	Preciso de um par de meias.
paper	o papel	Escreve neste papel.
paragraph	o parágrafo	Lê o primeiro parágrafo.
parent	o pai ou a mãe; o progenitor	Um pai espera lá fora.
park	estacionar; o parque	Estacionamos perto da estação.
part	a parte	Esta parte é fácil.
partner	o parceiro; a parceira	Trabalha com um parceiro.
party	a festa	A festa começa às sete.
passport	o passaporte	Mostra o passaporte, por favor.
past	passado; depois	São seis e meia.
pay	pagar	Pago com cartão.
pen	a caneta	Esta caneta é azul.
pencil	o lápis	Escrevo com um lápis.
people	as pessoas; a gente	Muitas pessoas estão aqui.
pepper	a pimenta	Adiciona pimenta à sopa.
perfect	perfeito	A tua resposta é perfeita.
period	o período; a aula	A aula é curta.
person	a pessoa	Uma pessoa está à espera.
personal	pessoal	Este é o meu telemóvel pessoal.
phone	o telefone; o telemóvel	O meu telemóvel está na mala.
photo	a foto	Tira uma foto aqui.
photograph	a fotografia; fotografar	Esta fotografia é antiga.
phrase	a frase; a expressão	Repete a frase, por favor.
piano	o piano	Ela toca piano.
picture	a imagem; a fotografia	Olha para esta imagem.
piece	o pedaço; a peça	Pega num pedaço de bolo.
pig	o porco	O porco está na quinta.
pink	cor-de-rosa	A mala dela é cor-de-rosa.
place	o lugar; o sítio	Este lugar é calmo.
plan	o plano; planear	Precisamos de um plano.
plane	o avião	O avião está atrasado.
plant	a planta	Rega a planta hoje.
play	brincar; jogar; tocar	As crianças brincam no parque.
player	o jogador; a jogadora	O jogador corre depressa.
please	por favor	Por favor, senta-te aqui.
point	o ponto	Este ponto é importante.
police	a polícia	A polícia está lá fora.
policeman	o polícia	O polícia ajuda-nos.
pool	a piscina	A piscina está fria.
poor	pobre	A criança pobre tem fome.
popular	popular	Esta canção é popular.
positive	positivo	Este é um resultado positivo.
possible	possível	É possível hoje?
post	a publicação; publicar	Leio a publicação dela online.
potato	a batata	Como uma batata.
pound	a libra	Custa uma libra.
practice	a prática	A prática ajuda todos os dias.
practise	praticar	Pratico inglês todos os dias.
prefer	preferir	Prefiro chá.
prepare	preparar	Prepara a tua mala esta noite.
present	presente; o presente	Ela está presente hoje.
pretty	bonito; bastante	O jardim é bonito.
price	o preço	O preço é baixo.
probably	provavelmente	Ela provavelmente sabe.
problem	o problema	Este problema é pequeno.
product	o produto	Este produto é novo.
programme	o programa	O programa começa agora.
project	o projeto	O nosso projeto está pronto.
purple	roxo	A camisa é roxa.
put	pôr; colocar	Põe o livro aqui.
quarter	o quarto	São duas e um quarto.
question	a pergunta	Faz uma pergunta.
quick	rápido	Este é um teste rápido.
quickly	depressa; rapidamente	Anda depressa, por favor.
quiet	calmo; silencioso	A biblioteca é silenciosa.
quite	bastante	Este quarto é bastante pequeno.
radio	o rádio	O rádio está alto.
rain	a chuva; chover	A chuva começa agora.
read	ler	Lê esta frase.
reader	o leitor; a leitora	O leitor gosta da história.
reading	a leitura	A leitura ajuda-me a aprender.
ready	pronto; pronta	O jantar está pronto.
real	real; verdadeiro	Este é um problema real.
really	realmente; mesmo	Gosto mesmo desta canção.
reason	a razão; o motivo	Diz-me a razão.
red	vermelho	A porta é vermelha.
relax	relaxar	Relaxa depois do trabalho.
remember	lembrar; recordar	Lembra-te do passaporte.
repeat	repetir	Repete a frase, por favor.
report	o relatório	Lê o relatório esta noite.
restaurant	o restaurante	O restaurante está cheio.
result	o resultado	O resultado é bom.
return	voltar; devolver	Devolve o livro amanhã.
rice	o arroz	Como arroz ao almoço.
rich	rico	A cidade é rica.
ride	andar; a viagem	Ando de bicicleta.
right	direita; certo	Vira à direita aqui.
river	o rio	O rio é largo.
road	a estrada	Esta estrada é longa.
room	o quarto; a sala	O meu quarto está limpo.
routine	a rotina	A minha rotina começa cedo.
rule	a regra	Esta regra é simples.
run	correr	Corro todas as manhãs.
sad	triste	Ele está triste hoje.
salad	a salada	Esta salada é fresca.
salt	o sal	Adiciona um pouco de sal.
same	o mesmo; a mesma	Temos a mesma mala.
sandwich	a sandes; o sanduíche	Como uma sandes.
Saturday	sábado	Encontramo-nos no sábado.
say	dizer	Diz o teu nome, por favor.
school	a escola	A minha escola fica perto.
science	a ciência	Estudo ciência.
scientist	o cientista; a cientista	O cientista faz uma pergunta.
sea	o mar	O mar é azul.
second1 (unit of time)	o segundo	Espera um segundo.
section	a secção	Lê esta secção.
see	ver	Vejo o meu amigo.
sell	vender	Eles vendem fruta fresca.
send	enviar; mandar	Envia a mensagem agora.
sentence	a frase	Escreve uma frase.
September	setembro	A escola começa em setembro.
seven	sete	Sete pessoas estão aqui.
seventeen	dezassete	Ele tem dezassete anos.
seventy	setenta	A minha avó tem setenta anos.
share	partilhar; dividir	Divide o bolo.
she	ela	Ela é a minha irmã.
sheep	a ovelha	A ovelha come erva.
shirt	a camisa	A camisa dele está limpa.
shoe	o sapato	Um sapato está debaixo da cama.
shop	a loja; comprar	A loja fecha cedo.
shopping	as compras	Fazer compras é divertido hoje.
short	curto; breve	Esta história é curta.
should modal	dever; deveria	Deves descansar hoje.
show	mostrar; o espetáculo	Mostra-me o teu bilhete.
shower	o duche; tomar duche	Tomo um duche.
sick	doente	Sinto-me doente hoje.
similar	semelhante	As nossas malas são semelhantes.
sing	cantar	Canto na aula.
singer	o cantor; a cantora	O cantor é famoso.
sister	a irmã	A minha irmã é jovem.
sit	sentar	Senta-te perto da janela.
situation	a situação	Esta situação é nova.
six	seis	Seis livros estão aqui.
sixteen	dezasseis	Ela tem dezasseis anos.
sixty	sessenta	O meu pai tem sessenta anos.
skill	a habilidade; a competência	Esta habilidade é útil.
skirt	a saia	A saia dela é azul.
sleep	dormir; o sono	Durmo oito horas.
slow	lento	O autocarro é lento.
small	pequeno	O quarto é pequeno.
snake	a cobra	A cobra é comprida.
snow	a neve; nevar	A neve cai no inverno.
so	então; por isso	Estou cansado, por isso descanso.
some	algum; alguns; um pouco de	Preciso de um pouco de água.
somebody	alguém	Alguém está à porta.
someone	alguém	Alguém deixou uma mensagem.
something	algo; alguma coisa	Preciso de algo para beber.
sometimes	às vezes	Às vezes vou a pé para a escola.
son	o filho	O filho dela está na escola.
song	a canção	Esta canção é nova.
soon	em breve; logo	Até breve.
sorry	desculpa; lamento	Lamento.
sound	o som	O som está alto.
soup	a sopa	A sopa está quente.
south	o sul	O hotel fica a sul daqui.
space	o espaço	Há espaço para uma cadeira.
speak	falar	Fala devagar, por favor.
special	especial	Hoje é um dia especial.
spell	soletrar	Soletra o teu nome.
spelling	a ortografia	Verifica a ortografia.
spend	gastar; passar	Gasto dinheiro em comida.
sport	o desporto	O futebol é um desporto popular.
spring	a primavera; saltar	As flores crescem na primavera.
stand	ficar de pé	Fica perto da porta.
star	a estrela	Vejo uma estrela brilhante.
start	começar; o início	Começa a lição agora.
statement	a afirmação	Esta afirmação é verdadeira.
station	a estação	A estação fica perto.
stay	ficar	Fica em casa hoje.
still	ainda	Ainda tenho fome.
stop	parar; a paragem	Para na esquina.
story	a história	Conta-me uma história.
street	a rua	Esta rua é calma.
strong	forte	Ele é forte.
student	o estudante; a estudante	O estudante lê um livro.
study	estudar; o estudo	Estudo inglês.
style	o estilo	Gosto deste estilo.
subject	a matéria; o assunto	O inglês é a minha matéria principal.
success	o sucesso	O sucesso precisa de prática.
sugar	o açúcar	Põe açúcar no chá.
summer	o verão	O verão é quente aqui.
sun	o sol	O sol está brilhante.
Sunday	domingo	Descansamos no domingo.
supermarket	o supermercado	O supermercado está aberto.
sure	certo; seguro	Tenho a certeza.
sweater	a camisola	A minha camisola é quente.
swim	nadar	Nado todas as semanas.
swimming	a natação	A natação é bom exercício.
table	a mesa	As chaves estão na mesa.`;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/u);
    if (match) args.set(match[1], match[2]);
  }
  return args;
}

function parseTsv(tsv) {
  const [headerLine, ...lines] = tsv.trim().split(/\r?\n/u);
  if (headerLine !== `source_headword\t${LANGUAGE}\texample_${LANGUAGE}`) {
    throw new Error(`Unexpected TSV header: ${headerLine}`);
  }
  const map = new Map();
  for (const [lineIndex, line] of lines.entries()) {
    const cells = line.split("\t");
    if (cells.length !== 3) {
      throw new Error(`Invalid TSV cell count at data line ${lineIndex + 2}: ${line}`);
    }
    const [sourceHeadword, display, example] = cells.map((cell) => cell.trim());
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Blank TSV value at data line ${lineIndex + 2}: ${line}`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Portuguese example must end with sentence punctuation for ${sourceHeadword}: ${example}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate Portuguese translation row for ${sourceHeadword}`);
    }
    map.set(sourceHeadword, { display, example });
  }
  return map;
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function buildSupportRow(row, translation) {
  return {
    release_id: row.release_id,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_candidate_id: row.source_candidate_id,
    source_headword: row.source_headword,
    reviewed_display_headword: row.reviewed_display_headword,
    reviewed_part_of_speech: row.reviewed_part_of_speech,
    example_EN: row.example_EN,
    [LANGUAGE]: translation.display,
    [`example_${LANGUAGE}`]: translation.example,
    translation_status: "draft_native_style_needs_source_assisted_qa",
    example_translation_status: "draft_scene_preserving_needs_source_assisted_qa",
    target_language_transcription_status: "not_included_for_support_language",
    article_display_included: true,
    article_display_policy: "include_natural_portuguese_articles_or_gender_markers_where_grammatically_useful_for_nouns",
    batch_id: BATCH_ID,
    batch_language: LANGUAGE,
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}

function updateContract(contract, outputPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: SCRIPT_PATH,
    script_version: SCRIPT_VERSION,
    path: outputPath,
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

  const existing = Array.isArray(contract.latest_support_translation_batches)
    ? contract.latest_support_translation_batches.filter((item) => item.batch_id !== BATCH_ID)
    : [];
  contract.latest_support_translation_batches = [...existing, batch];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate ZH support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after ZH.",
    "Run weak-language targeted review and source-backed support-language audits after all support languages are covered.",
    "Export US/UK workbooks only after all support-language gates pass.",
  ];
  contract.updated_at = new Date().toISOString();
  return contract;
}

async function main() {
  const args = parseArgs();
  const contractPath = args.get("contract");
  if (!contractPath) {
    throw new Error("Usage: node scripts/oxford/build-oxford-part003-support-translation-batch-pt.mjs --contract=<contract.json>");
  }

  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  const sourcePath = contract.latest_english_examples?.path
    || "outputs/oxford-vocabulary/examples/oxford_3000_core_a1_part_003_300_v1_english_examples_v1.jsonl";
  const outputPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pt_article_display_v1.jsonl";
  const summaryPath = "outputs/oxford-vocabulary/support-translations/oxford_3000_core_a1_part_003_300_v1_support_translation_batch_pt_article_display_v1_summary.md";
  const rows = await readJsonl(sourcePath);
  const releaseId = rows[0]?.release_id;
  if (releaseId !== "oxford_3000_core_a1_part_003_300_v1") {
    throw new Error(`Unexpected release_id: ${releaseId}`);
  }
  const translations = parseTsv(PT_TRANSLATIONS_TSV);

  if (rows.length !== 300) {
    throw new Error(`Expected 300 Part 003 rows, found ${rows.length}`);
  }

  const sourceHeadwords = new Set(rows.map((row) => row.source_headword));
  const missing = rows.map((row) => row.source_headword).filter((sourceHeadword) => !translations.has(sourceHeadword));
  if (missing.length) {
    throw new Error(`Missing Portuguese translations for: ${missing.join(", ")}`);
  }
  const unexpected = [...translations.keys()].filter((sourceHeadword) => !sourceHeadwords.has(sourceHeadword));
  if (unexpected.length) {
    throw new Error(`Unexpected Portuguese translation rows: ${unexpected.join(", ")}`);
  }

  const outputRows = rows.map((row) => buildSupportRow(row, translations.get(row.source_headword)));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${outputRows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const summary = `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}

- Script version: \`${SCRIPT_VERSION}\`
- Source rows: \`${sourcePath}\`
- Rows: ${outputRows.length}
- Languages: ${LANGUAGE}
- Article display: included in Portuguese display cells where grammatically useful
- Translation status: \`draft_native_style_needs_source_assisted_qa\`
- Example status: \`draft_scene_preserving_needs_source_assisted_qa\`
- Target-language transcriptions: not included
- Postgres import: false
- Google Sheet delivery: false

This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.
`;
  await writeFile(summaryPath, summary);

  const updatedContract = updateContract(contract, outputPath, summaryPath, outputRows);
  await writeFile(contractPath, `${JSON.stringify(updatedContract, null, 2)}\n`);

  console.log(JSON.stringify({
    release_id: releaseId,
    batch_id: BATCH_ID,
    languages: [LANGUAGE],
    rows: outputRows.length,
    display_cells: outputRows.length,
    example_cells: outputRows.length,
    path: outputPath,
    contract_updated: contractPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
