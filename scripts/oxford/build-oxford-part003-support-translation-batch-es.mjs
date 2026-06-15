#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-19.v1";
const LANGUAGE = "ES";
const BATCH_ID = "es_article_display_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part003-support-translation-batch-es.mjs";
const SENTENCE_END_RE = /[.!?¿]$/u;

const ES_TRANSLATIONS_TSV = `source_headword	ES	example_ES
machine	la máquina; el aparato	Esta máquina prepara café.
magazine	la revista	Ella lee una revista de música.
main	principal	Esta es la puerta principal.
make	hacer; preparar	Preparo el almuerzo en casa.
man	el hombre	El hombre es mi profesor.
many	muchos; muchas	Hay muchos estudiantes aquí.
map	el mapa	Mira el mapa.
March	marzo	Mi cumpleaños es en marzo.
market	el mercado	Compramos fruta en el mercado.
married	casado; casada	Mi hermana está casada.
May	mayo	La escuela termina en mayo.
maybe	quizás; tal vez	Quizás llueva.
me	me; a mí	Ayúdame, por favor.
meal	la comida; la comida principal	Esta comida está caliente.
mean	significar	¿Qué significa esta señal?
meaning	el significado	¿Cuál es el significado?
meat	la carne	Como carne para cenar.
meet	conocer; reunirse	Nos reunimos después de clase.
meeting	la reunión	La reunión empieza ahora.
member	el miembro; la miembro	Ella es miembro del club.
menu	el menú	Lee el menú, por favor.
message	el mensaje	Envío un mensaje corto.
metre	el metro	Camina un metro hacia delante.
midnight	la medianoche	El tren sale a medianoche.
mile	la milla	Caminamos una milla.
milk	la leche	Bebo leche con el desayuno.
million	el millón	Un millón de personas vive aquí.
minute1	el minuto	Espera un minuto, por favor.
miss	echar de menos; perder	Echo de menos mi escuela anterior.
mistake	el error	Esta respuesta tiene un error.
model	el modelo	Este es un modelo pequeño.
modern	moderno	La cocina es moderna.
moment	el momento	Espera un momento, por favor.
Monday	lunes	Empezamos a trabajar el lunes.
money	el dinero	Necesito algo de dinero.
month	el mes	Junio es un mes cálido.
more	más	Necesito más tiempo.
morning	la mañana	Estudio por la mañana.
most	la mayoría; más	La mayoría de los estudiantes escucha música.
mother	la madre	Mi madre trabaja hoy.
mountain	la montaña	La montaña es alta.
mouse	el ratón	Hay un ratón debajo de la silla.
mouth	la boca	Abre la boca, por favor.
move	mover; moverse	Mueve la silla aquí.
movie	la película	Vemos una película esta noche.
much	mucho; cuánto	¿Cuánto cuesta esto?
mum	mamá	Mi mamá está en casa.
museum	el museo	El museo abre a las diez.
music	la música	Escucho música.
must modal	deber; tener que	Debes parar aquí.
my	mi	Este es mi libro.
name	el nombre; llamar	Escribe tu nombre aquí.
natural	natural	Este zumo es natural.
near	cerca; cercano	El banco está cerca.
need	necesitar	Necesito un bolígrafo.
negative	negativo	Esta respuesta es negativa.
neighbour	el vecino; la vecina	Mi vecino es amable.
never	nunca	Nunca bebo café.
new	nuevo	Este teléfono es nuevo.
news	las noticias	Las noticias son buenas hoy.
newspaper	el periódico	Él lee un periódico.
next	siguiente	El siguiente autobús llega tarde.
next to	al lado de	Siéntate a mi lado.
nice	agradable; bonito	La habitación es agradable.
night	la noche	Duermo por la noche.
nine	nueve	Hay nueve estudiantes aquí.
nineteen	diecinueve	Ella tiene diecinueve años.
ninety	noventa	Mi abuelo tiene noventa años.
no	no	No, gracias.
no one	nadie	No hay nadie en la habitación.
nobody	nadie	No hay nadie en casa.
north	el norte	La estación está al norte de aquí.
nose	la nariz	Tengo la nariz fría.
not	no	No estoy cansado.
note	la nota	Escribe una nota ahora.
nothing	nada	No hay nada en la caja.
November	noviembre	Mi curso empieza en noviembre.
now	ahora	Ven aquí ahora.
number	el número	Escribe el número aquí.
nurse	el enfermero; la enfermera	La enfermera es amable.
object	el objeto	Pon el objeto sobre la mesa.
o’clock	en punto	La clase empieza a las nueve en punto.
October	octubre	Viajamos en octubre.
of	de	Esta es una taza de té.
off	apagado; fuera	Apaga la luz.
office	la oficina	Mi oficina es pequeña.
often	a menudo	A menudo voy a la escuela andando.
oh	oh; vaya	Oh, ahora entiendo.
OK	bien; de acuerdo	¿Está bien?
old	viejo; antiguo	Esta casa es vieja.
on	en; sobre	El libro está sobre la mesa.
once	una vez	Llamo una vez a la semana.
one	uno; una	Tengo una hermana.
onion	la cebolla	Corta una cebolla.
online	en línea	Estudio en línea.
only	solo	Tengo solo una bolsa.
open	abrir; abierto	Abre la ventana, por favor.
opinion	la opinión	¿Cuál es tu opinión?
opposite	enfrente de; opuesto	La tienda está enfrente del banco.
or	o	¿Té o café?
orange	la naranja; naranja	Esta naranja es dulce.
order	pedir; el pedido	Pido sopa.
other	otro; otra	Usa la otra puerta.
our	nuestro; nuestra	Esta es nuestra aula.
out	fuera; hacia fuera	Sal después del almuerzo.
outside	fuera; afuera	Los niños juegan fuera.
over	sobre; por encima de	El avión vuela sobre la ciudad.
own	propio	Tengo mi propia habitación.
page	la página	Abre la página diez.
paint	pintar	Pinta la pared de azul.
painting	la pintura; el cuadro	Este cuadro es bonito.
pair	el par	Necesito un par de calcetines.
paper	el papel	Escribe en este papel.
paragraph	el párrafo	Lee el primer párrafo.
parent	el padre; la madre	Un padre espera fuera.
park	aparcar; el parque	Aparcamos cerca de la estación.
part	la parte	Esta parte es fácil.
partner	el compañero; la compañera	Trabaja con un compañero.
party	la fiesta	La fiesta empieza a las siete.
passport	el pasaporte	Muestra tu pasaporte, por favor.
past	pasado; y media	Son las seis y media.
pay	pagar	Pago con tarjeta.
pen	el bolígrafo	Este bolígrafo es azul.
pencil	el lápiz	Escribo con un lápiz.
people	la gente; las personas	Hay mucha gente aquí.
pepper	la pimienta	Añade pimienta a la sopa.
perfect	perfecto	Tu respuesta es perfecta.
period	el periodo; la clase	La clase es corta.
person	la persona	Una persona espera.
personal	personal	Este es mi teléfono personal.
phone	el teléfono	Mi teléfono está en mi bolsa.
photo	la foto	Saca una foto aquí.
photograph	la fotografía	Esta fotografía es vieja.
phrase	la frase	Repite la frase, por favor.
piano	el piano	Ella toca el piano.
picture	la imagen; el dibujo	Mira esta imagen.
piece	el trozo; la pieza	Toma un trozo de pastel.
pig	el cerdo	El cerdo está en la granja.
pink	rosa	Su bolsa es rosa.
place	el lugar	Este lugar es tranquilo.
plan	el plan	Necesitamos un plan.
plane	el avión	El avión llega tarde.
plant	la planta; plantar	Riega la planta hoy.
play	jugar; tocar	Los niños juegan en el parque.
player	el jugador; la jugadora	El jugador corre rápido.
please	por favor	Siéntate aquí, por favor.
point	el punto	Este punto es importante.
police	la policía	La policía está fuera.
policeman	el policía	El policía nos ayuda.
pool	la piscina	La piscina está fría.
poor	pobre	El niño pobre tiene hambre.
popular	popular	Esta canción es popular.
positive	positivo	Este es un resultado positivo.
possible	posible	¿Es posible hoy?
post	la publicación; el correo	Leo su publicación en línea.
potato	la patata	Como una patata.
pound	la libra	Cuesta una libra.
practice	la práctica	La práctica ayuda cada día.
practise	practicar	Practico inglés todos los días.
prefer	preferir	Prefiero el té.
prepare	preparar	Prepara tu bolsa esta noche.
present	presente; el regalo	Ella está presente hoy.
pretty	bonito; bastante	El jardín es bonito.
price	el precio	El precio es bajo.
probably	probablemente	Ella probablemente lo sabe.
problem	el problema	Este problema es pequeño.
product	el producto	Este producto es nuevo.
programme	el programa	El programa empieza ahora.
project	el proyecto	Nuestro proyecto está listo.
purple	morado; púrpura	La camisa es morada.
put	poner	Pon el libro aquí.
quarter	el cuarto	Son las dos y cuarto.
question	la pregunta	Haz una pregunta.
quick	rápido	Esta es una prueba rápida.
quickly	rápidamente	Camina rápido, por favor.
quiet	tranquilo; silencioso	La biblioteca está tranquila.
quite	bastante	Esta habitación es bastante pequeña.
radio	la radio	La radio está alta.
rain	la lluvia	La lluvia empieza ahora.
read	leer	Lee esta oración.
reader	el lector; la lectora	Al lector le gusta la historia.
reading	la lectura	La lectura me ayuda a aprender.
ready	listo	La cena está lista.
real	real	Este es un problema real.
really	realmente	Me gusta mucho esta canción.
reason	la razón	Dime la razón.
red	rojo	La puerta es roja.
relax	relajarse	Relájate después del trabajo.
remember	recordar	Recuerda tu pasaporte.
repeat	repetir	Repite la oración, por favor.
report	el informe	Lee el informe esta noche.
restaurant	el restaurante	El restaurante está ocupado.
result	el resultado	El resultado es bueno.
return	devolver; volver	Devuelve el libro mañana.
rice	el arroz	Como arroz en el almuerzo.
rich	rico	La ciudad es rica.
ride	montar; ir en	Ando en bicicleta.
right	derecho; correcto	Gira a la derecha aquí.
river	el río	El río es ancho.
road	la carretera; el camino	Esta carretera es larga.
room	la habitación	Mi habitación está limpia.
routine	la rutina	Mi rutina empieza temprano.
rule	la regla	Esta regla es sencilla.
run	correr	Corro todas las mañanas.
sad	triste	Él está triste hoy.
salad	la ensalada	Esta ensalada está fresca.
salt	la sal	Añade un poco de sal.
same	igual; mismo	Tenemos la misma bolsa.
sandwich	el bocadillo; el sándwich	Como un bocadillo.
Saturday	sábado	Nos vemos el sábado.
say	decir	Di tu nombre, por favor.
school	la escuela	Mi escuela está cerca.
science	la ciencia	Estudio ciencias.
scientist	el científico; la científica	El científico hace una pregunta.
sea	el mar	El mar es azul.
second1 (unit of time)	el segundo	Espera un segundo.
section	la sección	Lee esta sección.
see	ver	Veo a mi amigo.
sell	vender	Venden fruta fresca.
send	enviar	Envía el mensaje ahora.
sentence	la oración; la frase	Escribe una oración.
September	septiembre	La escuela empieza en septiembre.
seven	siete	Hay siete personas aquí.
seventeen	diecisiete	Él tiene diecisiete años.
seventy	setenta	Mi abuela tiene setenta años.
share	compartir	Comparte el pastel.
she	ella	Ella es mi hermana.
sheep	la oveja	La oveja come hierba.
shirt	la camisa	Su camisa está limpia.
shoe	el zapato	Un zapato está debajo de la cama.
shop	la tienda	La tienda cierra temprano.
shopping	las compras	Hacer compras es divertido hoy.
short	corto	Esta historia es corta.
should modal	debería	Deberías descansar hoy.
show	mostrar	Muéstrame tu billete.
shower	la ducha	Me ducho.
sick	enfermo; malo	Me siento enfermo hoy.
similar	parecido	Nuestras bolsas son parecidas.
sing	cantar	Canto en clase.
singer	el cantante; la cantante	El cantante es famoso.
sister	la hermana	Mi hermana es joven.
sit	sentarse	Siéntate cerca de la ventana.
situation	la situación	Esta situación es nueva.
six	seis	Hay seis libros aquí.
sixteen	dieciséis	Ella tiene dieciséis años.
sixty	sesenta	Mi padre tiene sesenta años.
skill	la habilidad	Esta habilidad es útil.
skirt	la falda	Su falda es azul.
sleep	dormir	Duermo ocho horas.
slow	lento	El autobús es lento.
small	pequeño	La habitación es pequeña.
snake	la serpiente	La serpiente es larga.
snow	la nieve	La nieve cae en invierno.
so	así que; tan	Estoy cansado, así que descanso.
some	algo de; algunos	Necesito algo de agua.
somebody	alguien	Hay alguien en la puerta.
someone	alguien	Alguien dejó un mensaje.
something	algo	Necesito algo para beber.
sometimes	a veces	A veces camino a la escuela.
son	el hijo	Su hijo está en la escuela.
song	la canción	Esta canción es nueva.
soon	pronto	Hasta pronto.
sorry	lo siento; perdón	Lo siento.
sound	el sonido	El sonido es fuerte.
soup	la sopa	La sopa está caliente.
south	el sur	El hotel está al sur de aquí.
space	el espacio; el sitio	Hay espacio para una silla.
speak	hablar	Habla despacio, por favor.
special	especial	Hoy es un día especial.
spell	deletrear	Deletrea tu nombre.
spelling	la ortografía	Revisa tu ortografía.
spend	gastar	Gasto dinero en comida.
sport	el deporte	El fútbol es un deporte popular.
spring	la primavera	Las flores crecen en primavera.
stand	estar de pie	Ponte de pie cerca de la puerta.
star	la estrella	Veo una estrella brillante.
start	empezar	Empieza la clase ahora.
statement	la afirmación	Esta afirmación es verdadera.
station	la estación	La estación está cerca.
stay	quedarse	Quédate en casa hoy.
still	todavía	Todavía tengo hambre.
stop	parar; la parada	Para en la esquina.
story	la historia; el cuento	Cuéntame una historia.
street	la calle	Esta calle es tranquila.
strong	fuerte	Él es fuerte.
student	el estudiante; la estudiante	El estudiante lee un libro.
study	estudiar; el estudio	Estudio inglés.
style	el estilo	Me gusta este estilo.
subject	la asignatura	El inglés es mi asignatura principal.
success	el éxito	El éxito requiere práctica.
sugar	el azúcar	Pon azúcar en el té.
summer	el verano	El verano es caluroso aquí.
sun	el sol	El sol brilla.
Sunday	domingo	Descansamos el domingo.
supermarket	el supermercado	El supermercado está abierto.
sure	seguro	Estoy seguro.
sweater	el suéter	Mi suéter es cálido.
swim	nadar	Nado cada semana.
swimming	la natación	La natación es buen ejercicio.
table	la mesa	Las llaves están sobre la mesa.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a1_part_003_300_v1_contract_v0.json",
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
  const lines = ES_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tES\texample_ES") {
    throw new Error("Unexpected ES translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad ES translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad ES translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad ES example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate ES translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing ES translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`ES translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_part003_support_translation_batch_es_v1",
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
    ES: translation.display,
    example_ES: translation.example,
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
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.next_stage_options = [
    "Generate FR support-language translations/examples for Part 003 in the Oxford English-learning contour.",
    "Continue support-language translations/examples in documented order after FR.",
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
    `# Oxford Part 003 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
    "",
    `- Script version: \`${SCRIPT_VERSION}\``,
    `- Source rows: \`${examplesPath}\``,
    `- Rows: ${supportRows.length}`,
    `- Languages: ${LANGUAGE}`,
    "- Article display: included in Spanish display cells where grammatically useful",
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
