#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-18.v1";
const LANGUAGE = "ES";
const BATCH_ID = "es_v1";
const SCRIPT_PATH = "scripts/oxford/build-oxford-part002-support-translation-batch-es.mjs";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const ES_TRANSLATIONS_TSV = `source_headword	ES	example_ES
clothes	la ropa	Mi ropa está limpia.
club	el club	Ella va a un club de música.
coat	el abrigo	Mi abrigo es cálido.
coffee	el café	Bebo café por la mañana.
cold	frío; el frío	El agua está fría.
college	la universidad	Mi hermana estudia en la universidad.
colour	el color	Mi color favorito es el azul.
come	venir	Ven aquí, por favor.
common	común	Este nombre es común.
company	la empresa	Mi madre trabaja en una empresa.
compare	comparar	Compara estas dos imágenes.
complete	completo; completar	El formulario está completo.
computer	el ordenador	Este ordenador es nuevo.
concert	el concierto	Vamos a un concierto esta noche.
conversation	la conversación	Tuvimos una conversación corta.
cook	cocinar; el cocinero	Cocino la cena en casa.
cooking	la cocina; cocinar	Me gusta cocinar con mi padre.
cool	fresco; genial	La habitación está fresca.
correct	correcto; corregir	Tu respuesta es correcta.
cost	costar; el coste	¿Cuánto cuesta esto?
could modal	podría	Podría ayudarte.
country	el país	Canadá es un país grande.
course	el curso	Hago un curso de inglés.
cousin	el primo/la prima	Mi primo vive cerca.
cow	la vaca	La vaca come hierba.
cream	la nata; la crema	Añado nata al café.
create	crear	Ellos crean un juego nuevo.
culture	la cultura	Estudiamos la cultura local.
cup	la taza	Esta taza está vacía.
customer	el cliente/la clienta	El cliente hace una pregunta.
cut	cortar	Corta la manzana por la mitad.
dad	papá	Papá está en el trabajo.
dance	el baile; bailar	Bailamos después de cenar.
dancer	el bailarín/la bailarina	El bailarín se mueve rápido.
dancing	el baile	Bailar es divertido.
dangerous	peligroso	Esta carretera es peligrosa.
dark	oscuro	La habitación está oscura.
date	la fecha	¿Qué fecha es hoy?
daughter	la hija	Su hija tiene seis años.
day	el día	Que tengas un buen día.
dear	querido; estimado	Querido amigo, gracias.
December	diciembre	Mi cumpleaños es en diciembre.
decide	decidir	Decide ahora, por favor.
delicious	delicioso	Esta sopa está deliciosa.
describe	describir	Describe tu habitación.
description	la descripción	Lee la descripción corta.
design	el diseño; diseñar	Hago un diseño sencillo para la tarjeta.
desk	el escritorio	El libro está en mi escritorio.
detail	el detalle	Falta un detalle.
dialogue	el diálogo	Lee el diálogo ahora.
dictionary	el diccionario	Usa un diccionario en clase.
die	morir	Las flores mueren sin agua.
diet	la dieta; la alimentación	Mi dieta incluye fruta.
difference	la diferencia	Hay una diferencia.
different	diferente	Tenemos nombres diferentes.
difficult	difícil	Esta pregunta es difícil.
dinner	la cena	La cena está lista.
dirty	sucio	Mis zapatos están sucios.
discuss	hablar de; discutir	Hablamos del plan.
dish	el plato	Este plato está caliente.
do1	hacer	¿Qué haces?
doctor	el médico/la médica	El médico está ocupado.
dog	el perro	El perro corre fuera.
dollar	el dólar	Cuesta un dólar.
door	la puerta	Cierra la puerta, por favor.
down	abajo	Siéntate aquí abajo.
downstairs	abajo; en la planta baja	La cocina está abajo.
draw	dibujar	Dibuja una casa pequeña.
dress	el vestido; vestirse	Ella lleva un vestido rojo.
drink	la bebida; beber	Bebo agua.
drive	conducir	Conduzco al trabajo.
driver	el conductor/la conductora	El conductor para aquí.
during	durante	Duermo durante el vuelo.
DVD	el DVD	Este DVD es viejo.
each	cada	Cada niño tiene un libro.
ear	la oreja	Me duele la oreja.
early	temprano; temprano	Me levanto temprano.
east	el este	El sol sale por el este.
easy	fácil	Este examen es fácil.
eat	comer	Comemos juntos.
egg	el huevo	Como un huevo.
eight	ocho	Tengo ocho tarjetas.
eighteen	dieciocho	Ella tiene dieciocho años.
eighty	ochenta	Mi abuelo tiene ochenta años.
elephant	el elefante	El elefante es grande.
eleven	once	La clase empieza a las once.
else	otro; más	¿Qué más necesitas?
email	el correo electrónico	Envíame un correo electrónico.
end	el final; terminar	Este es el final.
enjoy	disfrutar	Disfruto esta canción.
enough	suficiente	Tenemos tiempo suficiente.
euro	el euro	Cuesta un euro.
even	incluso	Incluso mi hermano lo sabe.
evening	la tarde; la noche	Nos vemos esta noche.
event	el evento	El evento empieza hoy.
ever	alguna vez	¿Cocinas alguna vez?
every	cada	Estudio cada día.
everybody	todo el mundo	Todo el mundo está aquí.
everyone	todos; todo el mundo	A todos les gusta la música.
everything	todo	Todo está listo.
exam	el examen	El examen empieza pronto.
example	el ejemplo	Este es un buen ejemplo.
excited	emocionado	Estoy emocionado hoy.
exciting	emocionante	El juego es emocionante.
exercise	el ejercicio; hacer ejercicio	Hago ejercicio antes del desayuno.
expensive	caro	Este abrigo es caro.
explain	explicar	Explica esta palabra, por favor.
extra	extra; adicional	Necesito tiempo extra.
eye	el ojo	Tengo el ojo rojo.
face	la cara	Lávate la cara.
fact	el hecho	Este hecho es importante.
fall	caer; el otoño	Las hojas caen en otoño.
false	falso	Esta respuesta es falsa.
family	la familia	Mi familia es pequeña.
famous	famoso	Ella es una cantante famosa.
fantastic	fantástico	El concierto fue fantástico.
far	lejos; lejano	La escuela está lejos.
farm	la granja	Viven en una granja.
farmer	el granjero/la granjera	El granjero cultiva comida.
fast	rápido	Este tren es rápido.
fat	gordo	El gato está gordo.
father	el padre	Mi padre es alto.
favourite	favorito	Esta es mi canción favorita.
February	febrero	Febrero es frío aquí.
feel	sentir	Me siento feliz.
feeling	el sentimiento	Conozco ese sentimiento.
festival	el festival	El festival empieza mañana.
few	unos pocos; pocos	Hay pocos estudiantes aquí.
fifteen	quince	Tengo quince años.
fifth	quinto	Esta es la quinta clase.
fifty	cincuenta	Mi madre tiene cincuenta años.
fill	llenar; completar	Llena la taza con agua.
film	la película	Vemos una película.
final	final; último	Esta es la última pregunta.
find	encontrar	Encuentro las llaves.
fine	bien; bueno	Ahora estoy bien.
finish	terminar	Termina los deberes.
fire	el fuego; el incendio	El fuego está caliente.
first	primero	Ella es la primera en la fila.
fish	el pescado; el pez	Como pescado para cenar.
five	cinco	Tengo cinco libros.
flat	el piso	Mi piso es pequeño.
flight	el vuelo	El vuelo llega tarde.
floor	el suelo; el piso	La bolsa está en el suelo.
flower	la flor	Esta flor es amarilla.
fly	volar	Los pájaros vuelan en el cielo.
follow	seguir	Sígueme, por favor.
food	la comida	La comida está lista.
foot	el pie	Me duele el pie.
football	el fútbol	Jugamos al fútbol hoy.
for	para	Este regalo es para ti.
forget	olvidar	No olvides las llaves.
form	el formulario	Completa el formulario.
forty	cuarenta	Mi padre tiene cuarenta años.
four	cuatro	Veo cuatro pájaros.
fourteen	catorce	Ella tiene catorce años.
fourth	cuarto	Esta es la cuarta planta.
free	gratis; libre	La entrada es gratis.
Friday	viernes	Nos vemos el viernes.
friend	el amigo/la amiga	Mi amigo está aquí.
friendly	amable	El profesor es amable.
from	de; desde	Soy de aquí.
front	delante; la parte delantera	Ponte delante.
fruit	la fruta	Como fruta todos los días.
full	lleno	La botella está llena.
fun	la diversión; divertido	Este juego es divertido.
funny	gracioso	La película es graciosa.
future	el futuro	Piensa en tu futuro.
game	el juego	El juego empieza ahora.
garden	el jardín	El jardín es bonito.
geography	la geografía	Estudio geografía en la escuela.
get	recibir; llegar	Llego a casa a las seis.
girl	la niña; la chica	La niña sonríe.
girlfriend	la novia	Su novia es amable.
give	dar	Dame el libro.
glass	el vaso; el vidrio	Bebo de un vaso.
go	ir	Vamos a casa ahora.
good	bueno	Este café está bueno.
goodbye	adiós	Adiós, hasta mañana.
grandfather	el abuelo	Mi abuelo es mayor.
grandmother	la abuela	Mi abuela hace sopa.
grandparent	el abuelo/la abuela	Uno de mis abuelos vive con nosotros.
great	genial; grande	Es una idea genial.
green	verde	La puerta es verde.
grey	gris	El cielo está gris.
group	el grupo	Trabajad en un grupo pequeño.
grow	crecer; cultivar	Las plantas crecen en el jardín.
guess	adivinar; la suposición	Adivina la respuesta.
guitar	la guitarra	Él toca la guitarra.
gym	el gimnasio	Voy al gimnasio.
hair	el pelo	Ella tiene el pelo largo.
half	la mitad	Corta el pastel por la mitad.
hand	la mano	Levanta la mano.
happen	pasar; ocurrir	¿Qué pasa después?
happy	feliz	Estoy feliz hoy.
hard	duro; difícil	Esta silla es dura.
hat	el sombrero; el gorro	Mi gorro es negro.
hate	odiar	No me gusta el té frío.
have	tener	Tengo un coche.
have to modal	tener que	Tengo que estudiar.
he	él	Él es mi hermano.
head	la cabeza	Me duele la cabeza.
health	la salud	La buena comida ayuda a la salud.
healthy	sano	Este plato es sano.
hear	oír; escuchar	Oigo música.
hello	hola	Hola, encantado de conocerte.
help	la ayuda; ayudar	Ayúdame, por favor.
her	su; la; le	Esta es su bolsa.
here	aquí; acá	Ven aquí ahora.
hey	oye; hola	Oye, espérame.
hi	hola	Hola, ¿qué tal?
high	alto	La pared es alta.
him	lo; le; a él	Lo conozco.
his	su	Su abrigo es azul.
history	la historia	Estudio historia.
hobby	la afición	Leer es mi afición.
holiday	las vacaciones	Nos vamos de vacaciones en julio.
home	la casa; a casa	Estoy en casa.
homework	los deberes	Haz los deberes esta noche.
hope	esperar	Espero que vengas.
horse	el caballo	El caballo corre rápido.
hospital	el hospital	El hospital está cerca.
hot	caliente; caluroso	La sopa está caliente.
hotel	el hotel	El hotel está limpio.
hour	la hora	Espera una hora.
house	la casa	Esta casa es vieja.
how	cómo	¿Cómo estás?
however	sin embargo	Sin embargo, puedo quedarme aquí.
hundred	cien	Vinieron cien personas.
hungry	con hambre	Tengo hambre.
husband	el marido	Su marido es médico.
I	yo	Me encanta el té.
ice	el hielo	El hielo está frío.
ice cream	el helado	Quiero un helado.
idea	la idea	Es una buena idea.
if	si	Llámame si necesitas ayuda.
imagine	imaginar	Imagina una casa pequeña.
important	importante	Esta clase es importante.
improve	mejorar	Quiero mejorar.
in	en; dentro de	Las llaves están en mi bolsa.
include	incluir	Incluye tu nombre, por favor.
information	la información	Necesito más información.
interest	el interés	A ella le interesa el arte.
interested	interesado	Me interesa la música.
interesting	interesante	Este libro es interesante.
internet	internet	Internet va lento.
interview	la entrevista	Tengo una entrevista hoy.
into	en; dentro de	Pon los libros en la bolsa.
introduce	presentar	Presenta a tu amigo, por favor.
island	la isla	Esta isla es pequeña.
it	eso; ello	Hace frío.
its	su	Al perro le gusta su cama.
jacket	la chaqueta	Mi chaqueta es nueva.
January	enero	Enero es el primer mes.
jeans	los vaqueros	Mis vaqueros son azules.
job	el trabajo	Necesito un trabajo nuevo.
join	unirse	Únete a nuestra clase hoy.
journey	el viaje	El viaje es largo.
juice	el zumo	Bebo zumo de naranja.
July	julio	Viajamos en julio.
June	junio	La escuela termina en junio.
just	solo; simplemente	Solo necesito agua.
keep	guardar; mantener	Guarda esta llave.
key	la llave	Perdí la llave.
kilometre	el kilómetro	Camina un kilómetro.
kind (type)	el tipo; la clase	¿Qué tipo de música te gusta?
kitchen	la cocina	La cocina está limpia.
know	saber; conocer	Sé la respuesta.
land	la tierra	El avión está en tierra.
language	el idioma; la lengua	El inglés es un idioma.
large	grande	Esta habitación es grande.
last1 (final)	último	Esta es la última página.
late	tarde; retrasado	El autobús llega tarde.
later	más tarde	Hasta más tarde.
laugh	reír; la risa	Nos reímos juntos.
learn	aprender	Aprendo inglés.
leave	salir; dejar	Deja la puerta abierta.
left	izquierdo; a la izquierda	Gira a la izquierda aquí.
leg	la pierna	Me duele la pierna.
lesson	la clase; la lección	La clase empieza ahora.
let	dejar; permitir	Déjame ayudarte.
letter	la carta; la letra	Escribo una carta.
library	la biblioteca	La biblioteca abre a las nueve.
lie1	tumbarse; estar acostado	Túmbate en la cama, por favor.
life	la vida	La vida en la ciudad es animada.
like (similar)	como; parecido a	Esto parece un juego.
like (find sb/sth pleasant)	gustar	Me gusta esta canción.
line	la línea; la cola	Ponte en la cola.
lion	el león	El león duerme.
list	la lista; hacer una lista	Haz una lista de la compra.
listen	escuchar	Escucha al profesor.
little	pequeño; poco	Tengo poco dinero.
live1	vivir	Vivo cerca de la escuela.
local	local	Es una tienda local.
long1	largo	El camino es largo.
look	mirar; parecer	Mira la imagen.
lose	perder	No pierdas tu billete.
lot	mucho; un montón	Tengo muchos deberes.
love	el amor; amar	Quiero a mi familia.
lunch	el almuerzo; la comida	La comida está lista.`;

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
    reviewer: "codex_oxford_part002_support_translation_batch_es_v1",
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
