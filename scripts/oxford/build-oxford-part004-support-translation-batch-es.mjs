#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-20.v1";
const LANGUAGE = "ES";
const BATCH_ID = "es_article_display_v1";
const SENTENCE_END_RE = /[.!?¿]$/u;

const ES_TRANSLATIONS_TSV = `source_headword	ES	example_ES
take	tomar; coger	Toma el billete.
talk	hablar; la conversación	Hablamos después de clase.
tall	alto; alta	Mi profesor es alto.
taxi	el taxi	El taxi está fuera.
tea	el té	Este té está caliente.
teach	enseñar	Enseño inglés.
teacher	el profesor; la profesora	La profesora sonríe.
team	el equipo	Nuestro equipo gana hoy.
teenager	el adolescente; la adolescente	El adolescente lee un libro.
telephone	el teléfono; telefonear	El teléfono está en el escritorio.
television	la televisión; el televisor	La televisión es nueva.
tell	decir; contar	Dime tu nombre.
ten	diez	Tengo diez libros.
tennis	el tenis	Jugamos al tenis hoy.
terrible	terrible	El tiempo es terrible.
test	la prueba; el examen; evaluar	La prueba empieza ahora.
text	el mensaje de texto; enviar un mensaje	Envía un mensaje corto.
than	que	Diez es más que dos.
thank	agradecer	Da las gracias a tu profesor.
thanks	gracias	Gracias por tu ayuda.
that	ese; esa; aquel; aquello	Ese libro es mío.
the	el; la; los; las	El té está caliente.
theatre	el teatro	El teatro está cerca de la estación.
their	su; sus	Su casa es grande.
them	los; las; les	Los conozco.
then	entonces; luego	Come y luego estudia.
there	allí; hay	Hay una silla allí.
they	ellos; ellas	Ellos están en la escuela.
thing	la cosa; el objeto	Esta cosa es útil.
think	pensar	Pienso en casa.
third	tercero; tercera; el tercio	Esta es la tercera lección.
thirsty	sediento; con sed	Tengo sed.
thirteen	trece	Ella tiene trece años.
thirty	treinta	Mi hermana tiene treinta años.
this	este; esta	Este billete es nuevo.
thousand	mil	Vinieron mil personas.
three	tres	Veo tres pájaros.
through	por; a través de	Caminamos por el parque.
Thursday	jueves	Nos vemos el jueves.
ticket	el billete; la entrada	Necesito un billete.
time	el tiempo; la hora	¿Qué hora es?
tired	cansado; cansada	Estoy cansado.
title	el título	Lee el título.
to	a; para; marcador de infinitivo	Voy a clase.
today	hoy	Hoy hace sol.
together	juntos; juntas	Comemos juntos.
toilet	el baño; el inodoro	El baño está limpio.
tomato	el tomate	Este tomate es rojo.
tomorrow	mañana	Hasta mañana.
tonight	esta noche	Estudiamos esta noche.
too	también; demasiado	Yo también quiero té.
tooth	el diente	Me duele un diente.
topic	el tema	Elige un tema.
tourist	el turista; la turista	El turista toma fotos.
town	el pueblo; la ciudad	Este pueblo es tranquilo.
traffic	el tráfico	El tráfico va lento.
train	el tren; entrenar	El tren llega tarde.
travel	viajar; el viaje	Viajamos en tren.
tree	el árbol	El árbol es alto.
trip	el viaje; la excursión	El viaje empieza mañana.
trousers	los pantalones	Mis pantalones son negros.
true	verdadero; cierto	Esa historia es verdadera.
try	probar; intentar	Prueba este té.
T-shirt	la camiseta	Llevo una camiseta.
Tuesday	martes	Nos vemos el martes.
turn	girar; el turno	Gira a la izquierda aquí.
TV	la tele; el televisor	La tele está alta.
twelve	doce	Tengo doce bolígrafos.
twenty	veinte	Hay veinte estudiantes aquí.
twice	dos veces	Nado dos veces por semana.
two	dos	Dos personas esperan.
type	el tipo; escribir a máquina	¿Qué tipo de música?
umbrella	el paraguas	Toma un paraguas.
uncle	el tío	Mi tío es amable.
under	debajo de	La bolsa está debajo de la mesa.
understand	entender	Entiendo la pregunta.
university	la universidad	La universidad está cerca.
until	hasta	Espera hasta las cinco.
up	arriba; hacia arriba	Levántate ahora.
upstairs	arriba; en el piso de arriba	Mi habitación está arriba.
us	nos; a nosotros	Ayúdanos, por favor.
use	usar; el uso	Usa este bolígrafo.
useful	útil	Este mapa es útil.
usually	normalmente	Normalmente camino a casa.
vacation	las vacaciones	Nuestras vacaciones empiezan mañana.
vegetable	la verdura; el vegetal	La zanahoria es una verdura.
very	muy	La habitación está muy tranquila.
video	el video; el vídeo	Mira este video.
village	el pueblo	El pueblo es pequeño.
visit	visitar; la visita	Visitamos a nuestra tía.
visitor	el visitante; la visitante	El visitante espera fuera.
wait	esperar	Espera aquí, por favor.
waiter	el camarero; el mesero	El camarero trae té.
wake	despertar; despertarse	Me despierto temprano.
walk	caminar; el paseo	Caminamos a la escuela.
wall	la pared	La pared es blanca.
want	querer	Quiero agua.
warm	cálido; caliente; calentar	La habitación está cálida.
wash	lavar; el lavado	Lávate las manos.
watch	ver; mirar; el reloj	Veo la televisión.
water	el agua; regar	Bebe un poco de agua.
way	el camino; la manera	Este camino es corto.
we	nosotros; nosotras	Estudiamos inglés.
wear	llevar puesto	Llevo una chaqueta.
weather	el tiempo; el clima	El tiempo está frío.
website	el sitio web	Este sitio web es útil.
Wednesday	miércoles	La clase empieza el miércoles.
week	la semana	Esta semana está ocupada.
weekend	el fin de semana	El fin de semana empieza mañana.
welcome	bienvenido; bienvenida; dar la bienvenida	Bienvenido a nuestra clase.
well	bien	Ella canta bien.
west	el oeste	El sol se pone en el oeste.
what	qué	¿Qué es eso?
when	cuándo	¿Cuándo estudias?
where	dónde	¿Dónde está la estación?
which	cuál; qué	¿Cuál bolsa es tuya?
white	blanco; blanca	La pared es blanca.
who	quién	¿Quién es?
why	por qué	¿Por qué llegas tarde?
wife	la esposa	Su esposa es profesora.
will modal	will; futuro con will	Te ayudaré.
win	ganar	Nuestro equipo puede ganar.
window	la ventana	Abre la ventana.
wine	el vino	Este vino es tinto.
winter	el invierno	El invierno es frío aquí.
with	con	Ven conmigo.
without	sin	El té sin azúcar está bien.
woman	la mujer	La mujer lee un libro.
wonderful	maravilloso; maravillosa	La vista es maravillosa.
word	la palabra	Escribe una palabra.
work	trabajar; el trabajo	Trabajo en casa.
worker	el trabajador; la trabajadora	El trabajador está ocupado.
world	el mundo	El mundo es grande.
would modal	would; condicional con would	Quisiera té.
write	escribir	Escribe tu nombre.
writer	el escritor; la escritora	El escritor vive aquí.
writing	la escritura; el escrito	Su escritura es clara.
wrong	incorrecto; equivocado	Esta respuesta es incorrecta.
yeah	sí; claro	Sí, puedo venir.
year	el año	Este año es bueno.
yellow	amarillo; amarilla	El plátano es amarillo.
yes	sí	Sí, entiendo.
yesterday	ayer	Llamé ayer.
you	tú; usted; ustedes	Tú eres mi amigo.
young	joven	El niño es joven.
your	tu; su; tus; sus	Tu bolsa está aquí.
yourself	tú mismo; usted mismo	Sírvete té.`;

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
    reviewer: "codex_oxford_part004_support_translation_batch_es_article_display_v1",
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
    script_path: "scripts/oxford/build-oxford-part004-support-translation-batch-es.mjs",
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
    "Generate the next support-language batch in language order: FR.",
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
    "- Article display: true where grammatically useful for Spanish nouns",
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
