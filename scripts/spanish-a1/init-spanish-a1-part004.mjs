#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "spanish_a1_core_part_004_300_v1";
const PART_LABEL = "Part 004";
const CONTRACT_PATH = path.join(ROOT, "config/spanish-a1-core-part-004-release-contract-v1.json");
const CANDIDATE_PATH = path.join(ROOT, "config/spanish-a1-core-part-004-candidates.tsv");
const LATAM_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-004-course-metadata.json");
const SPAIN_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-004-course-metadata-spain.json");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

function row(pos, lemma, displayES, displayES419, articleES, articleES419, gender, numberPolicy, verbInfinitive, verbGroup, meaningNote, semanticScene, topicDomain, exampleES, exampleES419 = exampleES) {
  return {
    part_of_speech: pos,
    source_lemma: lemma,
    display_ES: displayES,
    display_ES_419: displayES419,
    article_ES: articleES,
    article_ES_419: articleES419,
    gender,
    number_policy: numberPolicy,
    verb_infinitive: verbInfinitive,
    verb_group: verbGroup,
    meaning_note: meaningNote,
    semantic_scene: semanticScene,
    topic_domain: topicDomain,
    example_ES: exampleES,
    example_ES_419: exampleES419,
  };
}

function x(pos, lemma, domain, note, scene, exampleES, exampleES419 = exampleES, displayES419 = lemma) {
  return row(pos, lemma, lemma, displayES419, "not_applicable", "not_applicable", "not_applicable", "not_applicable", "not_applicable", "not_applicable", note, scene, domain, exampleES, exampleES419);
}

function n(lemma, article, gender, domain, note, scene, exampleES, exampleES419 = exampleES, displayES419 = lemma, articleES419 = article) {
  const numberPolicy = article === "los" || article === "las" ? "plural_default" : "singular_default";
  return row("noun", lemma, lemma, displayES419, article, articleES419, gender, numberPolicy, "not_applicable", "not_applicable", note, scene, domain, exampleES, exampleES419);
}

function v(lemma, group, domain, note, scene, exampleES, exampleES419 = exampleES, displayES419 = lemma) {
  return row("verb", lemma, lemma, displayES419, "not_applicable", "not_applicable", "not_applicable", "not_applicable", lemma, group, note, scene, domain, exampleES, exampleES419);
}

function adj(lemma, domain, note, scene, exampleES, exampleES419 = exampleES) {
  return x("adjective", lemma, domain, note, scene, exampleES, exampleES419);
}

const candidateBacklog = [
  x("interjection", "pues", "grammar_function_words", "well or then", "softening a reply", "Pues, necesito más tiempo."),
  x("adverb", "realmente", "grammar_function_words", "really", "emphasizing a fact", "Realmente quiero aprender."),
  x("adverb", "normalmente", "time_frequency", "normally", "usual routine", "Normalmente como en casa."),
  x("adverb", "generalmente", "time_frequency", "generally", "usual habit", "Generalmente camino al trabajo."),
  x("adverb", "especialmente", "degree_manner", "especially", "special preference", "Me gusta especialmente esta canción."),
  x("adverb", "solamente", "degree_manner", "only", "limiting a choice", "Solamente tengo un minuto."),
  x("adverb", "rápidamente", "degree_manner", "quickly", "fast action", "Respondo rápidamente al mensaje."),
  x("adverb", "lentamente", "degree_manner", "slowly", "slow action", "Camino lentamente por la calle."),
  x("adverb", "fácilmente", "degree_manner", "easily", "easy result", "Entiendo fácilmente la palabra."),
  x("adverb", "allá", "location_direction", "over there", "pointing far away", "La montaña está allá."),
  x("adverb", "acá", "location_direction", "over here", "calling someone here", "Ven acá un momento."),
  x("adverb", "encima", "location_direction", "on top", "place above", "El vaso está encima."),
  x("adverb", "debajo", "location_direction", "underneath", "place below", "La caja está debajo."),
  x("adverb", "afuera", "location_direction", "outside", "outside a place", "Los niños están afuera."),
  x("adverb", "adentro", "location_direction", "inside", "inside a place", "El perro está adentro."),
  x("adverb", "enseguida", "time_sequence", "right away", "immediate action", "Voy enseguida a la puerta."),
  x("adverb", "finalmente", "time_sequence", "finally", "last step", "Finalmente llegamos al hotel."),
  x("adverb", "recientemente", "time_sequence", "recently", "recent event", "Recientemente cambié de trabajo."),
  x("adverb", "aproximadamente", "degree_manner", "approximately", "estimated amount", "Cuesta aproximadamente diez euros."),
  x("adverb", "directamente", "degree_manner", "directly", "direct route", "Voy directamente al banco."),
  x("ordinal", "cuarto", "numbers_order", "fourth", "order in a line", "Soy el cuarto en la fila."),
  x("ordinal", "quinto", "numbers_order", "fifth", "order in a list", "El quinto ejercicio es fácil."),
  x("ordinal", "sexto", "numbers_order", "sixth", "order in a list", "Vivo en el sexto piso."),
  x("ordinal", "séptimo", "numbers_order", "seventh", "order in a list", "El séptimo día descanso."),
  x("ordinal", "octavo", "numbers_order", "eighth", "order in a list", "El octavo capítulo es corto."),
  x("ordinal", "noveno", "numbers_order", "ninth", "order in a list", "El noveno tren llega tarde."),
  x("ordinal", "décimo", "numbers_order", "tenth", "order in a list", "El décimo alumno lee la frase."),
  x("numeral", "cuarenta", "numbers_order", "forty", "counting euros", "El abrigo cuesta cuarenta euros."),
  x("numeral", "cincuenta", "numbers_order", "fifty", "counting minutes", "El viaje dura cincuenta minutos."),
  x("numeral", "sesenta", "numbers_order", "sixty", "counting minutes", "La clase dura sesenta minutos."),
  x("numeral", "setenta", "numbers_order", "seventy", "counting euros", "La cuenta es de setenta euros."),
  x("numeral", "ochenta", "numbers_order", "eighty", "counting kilometers", "La ciudad está a ochenta kilómetros."),
  x("numeral", "noventa", "numbers_order", "ninety", "counting minutes", "El vuelo dura noventa minutos."),
  x("numeral", "cien", "numbers_order", "one hundred", "counting units", "Hay cien personas en la plaza."),
  x("numeral", "mil", "numbers_order", "one thousand", "large number", "El pueblo tiene mil habitantes."),
  n("mitad", "la", "feminine", "grammar_function_words", "half", "half portion", "Quiero la mitad del pan."),
  n("vez", "la", "feminine", "time_sequence", "time or occasion", "one occasion", "Esta vez voy contigo."),
  n("final", "el", "masculine", "time_sequence", "end", "end of a route", "El final del camino está cerca."),
  n("principio", "el", "masculine", "time_sequence", "beginning", "beginning of a lesson", "El principio de la clase es fácil."),
  n("futuro", "el", "masculine", "time_sequence", "future", "future plan", "El futuro parece tranquilo."),
  n("pasado", "el", "masculine", "time_sequence", "past", "past time", "El pasado queda atrás."),
  n("presente", "el", "masculine", "time_sequence", "present", "current time", "Vivo en el presente."),
  n("orden", "el", "masculine", "grammar_function_words", "order", "correct order", "El orden de la lista es claro."),
  n("ejemplo", "el", "masculine", "learning_basics", "example", "example sentence", "El ejemplo ayuda mucho."),
  n("idea", "la", "feminine", "learning_basics", "idea", "simple idea", "La idea es buena."),

  n("bebé", "el", "masculine", "people_family", "baby", "baby at home", "El bebé duerme en la cuna."),
  n("adulto", "el", "masculine", "people_family", "adult man", "adult person", "El adulto firma el papel."),
  n("adulta", "la", "feminine", "people_family", "adult woman", "adult person", "La adulta ayuda al niño."),
  n("adolescente", "not_applicable", "common", "people_family", "teenager", "teenager at school", "El adolescente lee en clase."),
  n("anciano", "el", "masculine", "people_family", "elderly man", "older person", "El anciano camina despacio."),
  n("anciana", "la", "feminine", "people_family", "elderly woman", "older person", "La anciana toma té."),
  n("novio", "el", "masculine", "people_family", "boyfriend or groom", "partner", "Mi novio trabaja hoy."),
  n("novia", "la", "feminine", "people_family", "girlfriend or bride", "partner", "Mi novia estudia español."),
  n("marido", "el", "masculine", "people_family", "husband", "family relation", "Mi marido cocina arroz."),
  n("esposa", "la", "feminine", "people_family", "wife", "family relation", "Mi esposa lee un libro."),
  n("suegro", "el", "masculine", "people_family", "father-in-law", "family relation", "Mi suegro vive cerca."),
  n("suegra", "la", "feminine", "people_family", "mother-in-law", "family relation", "Mi suegra llama por teléfono."),
  n("cuñado", "el", "masculine", "people_family", "brother-in-law", "family relation", "Mi cuñado trabaja en una tienda."),
  n("cuñada", "la", "feminine", "people_family", "sister-in-law", "family relation", "Mi cuñada prepara café."),
  n("abogado", "el", "masculine", "people_work", "lawyer", "work role", "El abogado revisa el contrato."),
  n("abogada", "la", "feminine", "people_work", "female lawyer", "work role", "La abogada lee el documento."),
  n("arquitecto", "el", "masculine", "people_work", "architect", "work role", "El arquitecto dibuja una casa."),
  n("arquitecta", "la", "feminine", "people_work", "female architect", "work role", "La arquitecta mira el plano."),
  n("ingeniero", "el", "masculine", "people_work", "engineer", "work role", "El ingeniero arregla la máquina."),
  n("ingeniera", "la", "feminine", "people_work", "female engineer", "work role", "La ingeniera prueba el motor."),
  n("taxista", "not_applicable", "common", "people_transport", "taxi driver", "driver role", "La taxista espera en la parada."),
  n("soldado", "not_applicable", "common", "people_work", "soldier", "work role", "El soldado está en la puerta."),
  n("bombero", "el", "masculine", "people_work", "firefighter", "work role", "El bombero ayuda en la calle."),
  n("bombera", "la", "feminine", "people_work", "female firefighter", "work role", "La bombera lleva agua."),
  n("peluquero", "el", "masculine", "people_services", "hairdresser", "service role", "El peluquero corta el pelo."),
  n("peluquera", "la", "feminine", "people_services", "female hairdresser", "service role", "La peluquera lava el pelo."),
  n("vendedor", "el", "masculine", "people_services", "salesman", "shop role", "El vendedor muestra una chaqueta."),
  n("vendedora", "la", "feminine", "people_services", "saleswoman", "shop role", "La vendedora cobra en la caja."),
  n("panadero", "el", "masculine", "people_food_services", "baker", "food job", "El panadero hace pan."),
  n("panadera", "la", "feminine", "people_food_services", "female baker", "food job", "La panadera vende pasteles."),
  n("carnicero", "el", "masculine", "people_food_services", "butcher", "food job", "El carnicero corta carne."),
  n("carnicera", "la", "feminine", "people_food_services", "female butcher", "food job", "La carnicera pesa el pollo."),
  n("mecánico", "el", "masculine", "people_services", "mechanic", "repair role", "El mecánico revisa el coche."),
  n("mecánica", "la", "feminine", "people_services", "female mechanic", "repair role", "La mecánica cambia una rueda."),
  n("cajera", "la", "feminine", "people_services", "cashier", "cash desk role", "La cajera da el recibo."),

  n("agenda", "la", "feminine", "study_office_digital", "planner", "planning object", "La agenda tiene una cita."),
  n("carpeta", "la", "feminine", "study_office_digital", "folder", "office object", "La carpeta está en el escritorio."),
  n("archivo", "el", "masculine", "study_office_digital", "file", "digital file", "El archivo está en la computadora."),
  n("papel", "el", "masculine", "study_office_digital", "paper", "writing material", "El papel está sobre la mesa."),
  n("lápiz", "el", "masculine", "study_office_digital", "pencil", "writing tool", "El lápiz escribe bien."),
  n("goma", "la", "feminine", "study_office_digital", "eraser", "school object", "La goma borra la palabra."),
  n("regla", "la", "feminine", "study_office_digital", "ruler", "school object", "La regla está en la mochila."),
  n("pizarra", "la", "feminine", "study_office_digital", "board", "classroom object", "La pizarra está limpia."),
  n("escritorio", "el", "masculine", "study_office_digital", "desk", "work furniture", "El escritorio tiene una lámpara."),
  n("pantalla", "la", "feminine", "study_office_digital", "screen", "computer screen", "La pantalla está encendida."),
  n("teclado", "el", "masculine", "study_office_digital", "keyboard", "computer object", "El teclado está limpio."),
  n("ratón", "el", "masculine", "study_office_digital", "computer mouse", "computer object", "El ratón está junto al teclado."),
  n("impresora", "la", "feminine", "study_office_digital", "printer", "office machine", "La impresora no funciona."),
  n("cable", "el", "masculine", "study_office_digital", "cable", "tech object", "El cable está en la bolsa."),
  n("cargador", "el", "masculine", "study_office_digital", "charger", "phone charger", "El cargador está en la mesa."),
  n("batería", "la", "feminine", "study_office_digital", "battery", "device power", "La batería está baja."),
  n("contraseña", "la", "feminine", "study_office_digital", "password", "login word", "La contraseña es corta."),
  n("mensaje", "el", "masculine", "study_office_digital", "message", "phone message", "El mensaje llega ahora."),
  n("llamada", "la", "feminine", "study_office_digital", "call", "phone call", "La llamada dura poco."),
  n("página", "la", "feminine", "study_office_digital", "page", "book page", "La página tiene una foto."),
  n("aplicación", "la", "feminine", "study_office_digital", "application", "phone app", "La aplicación abre rápido."),
  n("cámara", "la", "feminine", "study_office_digital", "camera", "taking a photo", "La cámara está en la mochila."),
  n("vídeo", "el", "masculine", "study_office_digital", "video", "watching a video", "El vídeo dura dos minutos."),
  n("internet", "el", "masculine", "study_office_digital", "internet", "online access", "El internet funciona bien."),
  n("computadora", "la", "feminine", "study_office_digital", "computer", "computer on a desk", "La computadora está encendida."),
  n("tableta", "la", "feminine", "study_office_digital", "tablet", "tablet device", "La tableta tiene una aplicación."),
  n("auricular", "el", "masculine", "study_office_digital", "earbud or earphone", "audio object", "El auricular está en la bolsa."),
  n("altavoz", "el", "masculine", "study_office_digital", "speaker", "audio device", "El altavoz suena fuerte."),
  n("micrófono", "el", "masculine", "study_office_digital", "microphone", "audio device", "El micrófono está abierto."),
  n("fotocopia", "la", "feminine", "study_office_digital", "photocopy", "copy on paper", "La fotocopia está lista."),
  n("copia", "la", "feminine", "study_office_digital", "copy", "copy of a document", "Necesito una copia del documento."),
  n("tinta", "la", "feminine", "study_office_digital", "ink", "printer ink", "La tinta es negra."),
  n("contrato", "el", "masculine", "admin_services", "contract", "work contract", "El contrato está firmado."),
  n("factura", "la", "feminine", "admin_services", "invoice or bill", "service bill", "La factura llega por correo."),
  n("impuesto", "el", "masculine", "admin_services", "tax", "payment duty", "El impuesto es alto."),
  n("multa", "la", "feminine", "admin_services", "fine", "traffic fine", "La multa cuesta mucho."),
  n("turno", "el", "masculine", "admin_services", "turn or shift", "waiting turn", "Mi turno empieza ahora."),
  n("cola", "la", "feminine", "admin_services", "queue or line", "waiting line", "La cola es larga."),
  n("permiso", "el", "masculine", "admin_services", "permit or permission", "official permission", "Necesito permiso para entrar."),
  n("anuncio", "el", "masculine", "media_leisure", "advertisement or announcement", "public notice", "El anuncio está en la pared."),
  n("noticia", "la", "feminine", "media_leisure", "news item", "news story", "La noticia es importante."),
  n("artículo", "el", "masculine", "media_leisure", "article", "written article", "El artículo es corto."),
  n("sección", "la", "feminine", "media_leisure", "section", "book section", "La sección empieza aquí."),
  n("capítulo", "el", "masculine", "media_leisure", "chapter", "book chapter", "El capítulo termina hoy."),

  n("frente", "la", "feminine", "body_health_clothing", "forehead", "body part", "Me duele la frente."),
  n("mejilla", "la", "feminine", "body_health_clothing", "cheek", "body part", "La mejilla está roja."),
  n("codo", "el", "masculine", "body_health_clothing", "elbow", "body part", "Me duele el codo."),
  n("muñeca", "la", "feminine", "body_health_clothing", "wrist", "body part", "La muñeca está hinchada."),
  n("vientre", "el", "masculine", "body_health_clothing", "belly", "body part", "Me duele el vientre."),
  n("pulmón", "el", "masculine", "body_health_clothing", "lung", "body organ", "El pulmón necesita aire."),
  n("hígado", "el", "masculine", "body_health_clothing", "liver", "body organ", "El hígado está en el cuerpo."),
  n("cerebro", "el", "masculine", "body_health_clothing", "brain", "body organ", "El cerebro trabaja siempre."),
  n("memoria", "la", "feminine", "body_health_clothing", "memory", "remembering", "Mi memoria es buena."),
  n("lágrima", "la", "feminine", "body_health_clothing", "tear", "crying", "La lágrima cae despacio."),
  n("sonrisa", "la", "feminine", "body_health_clothing", "smile", "friendly expression", "Su sonrisa es bonita."),
  n("sueño", "el", "masculine", "body_health_clothing", "sleepiness or dream", "feeling sleepy", "Tengo sueño esta noche."),
  n("cansancio", "el", "masculine", "body_health_clothing", "tiredness", "feeling tired", "El cansancio llega tarde."),
  n("enfermedad", "la", "feminine", "body_health_clothing", "illness", "health problem", "La enfermedad no es grave."),
  n("síntoma", "el", "masculine", "body_health_clothing", "symptom", "health sign", "El síntoma empieza hoy."),
  n("jarabe", "el", "masculine", "body_health_clothing", "syrup", "medicine syrup", "El jarabe está en la cocina."),
  n("inyección", "la", "feminine", "body_health_clothing", "injection", "medical injection", "La inyección es rápida."),
  n("operación", "la", "feminine", "body_health_clothing", "operation", "medical operation", "La operación es mañana."),
  n("urgencia", "la", "feminine", "body_health_clothing", "emergency", "urgent problem", "La urgencia empieza ahora."),
  n("alcohol", "el", "masculine", "body_health_clothing", "alcohol", "cleaning liquid", "El alcohol está en el botiquín."),
  n("algodón", "el", "masculine", "body_health_clothing", "cotton", "medical cotton", "El algodón está limpio."),
  n("mascarilla", "la", "feminine", "body_health_clothing", "mask", "face mask", "La mascarilla está en la bolsa."),
  n("esponja", "la", "feminine", "body_health_clothing", "sponge", "bath item", "La esponja está en la ducha."),
  n("secador", "el", "masculine", "body_health_clothing", "hair dryer", "bathroom item", "El secador está en el baño."),
  n("maquillaje", "el", "masculine", "body_health_clothing", "makeup", "personal care", "El maquillaje está en la mesa."),
  n("afeitadora", "la", "feminine", "body_health_clothing", "razor", "personal care", "La afeitadora está apagada."),
  n("cinturón", "el", "masculine", "body_health_clothing", "belt", "clothing accessory", "El cinturón es negro."),
  n("bufanda", "la", "feminine", "body_health_clothing", "scarf", "clothing accessory", "La bufanda es roja."),
  n("guante", "el", "masculine", "body_health_clothing", "glove", "clothing accessory", "El guante está mojado."),
  n("pijama", "el", "masculine", "body_health_clothing", "pajamas", "sleep clothes", "El pijama es cómodo."),
  n("uniforme", "el", "masculine", "body_health_clothing", "uniform", "school clothes", "El uniforme está limpio."),
  n("bolsillo", "el", "masculine", "body_health_clothing", "pocket", "clothing part", "La llave está en el bolsillo."),
  n("talla", "la", "feminine", "body_health_clothing", "size", "clothing size", "La talla es pequeña."),
  n("marca", "la", "feminine", "body_health_clothing", "brand", "product brand", "La marca es nueva."),
  n("botón", "el", "masculine", "body_health_clothing", "button", "clothing button", "El botón está roto."),

  n("azotea", "la", "feminine", "home_city_travel_nature", "roof terrace", "building top", "La azotea tiene plantas."),
  n("calefacción", "la", "feminine", "home_city_travel_nature", "heating", "home heating", "La calefacción está encendida."),
  n("ventilador", "el", "masculine", "home_city_travel_nature", "fan", "home appliance", "El ventilador mueve el aire."),
  n("persiana", "la", "feminine", "home_city_travel_nature", "blind or shutter", "window covering", "La persiana está bajada."),
  n("interruptor", "el", "masculine", "home_city_travel_nature", "light switch", "wall switch", "El interruptor está junto a la puerta."),
  n("mueble", "el", "masculine", "home_city_travel_nature", "piece of furniture", "home object", "El mueble es de madera."),
  n("colchón", "el", "masculine", "home_city_travel_nature", "mattress", "bed part", "El colchón es cómodo."),
  n("sillón", "el", "masculine", "home_city_travel_nature", "armchair", "living room chair", "El sillón está junto al sofá."),
  n("estufa", "la", "feminine", "home_city_travel_nature", "stove or heater", "heating appliance", "La estufa calienta la sala."),
  n("cuna", "la", "feminine", "home_city_travel_nature", "crib", "baby bed", "La cuna está en el dormitorio."),
  n("cesto", "el", "masculine", "home_city_travel_nature", "basket", "home container", "El cesto está lleno."),
  n("cubo", "el", "masculine", "home_city_travel_nature", "bucket", "cleaning object", "El cubo tiene agua."),
  n("escoba", "la", "feminine", "home_city_travel_nature", "broom", "cleaning tool", "La escoba está detrás de la puerta."),
  n("fregona", "la", "feminine", "home_city_travel_nature", "mop", "cleaning tool", "La fregona está limpia."),
  n("detergente", "el", "masculine", "home_city_travel_nature", "detergent", "cleaning product", "El detergente está en la lavadora."),
  n("trastero", "el", "masculine", "home_city_travel_nature", "storage room", "storage place", "El trastero está abajo."),
  n("portero", "el", "masculine", "home_city_travel_nature", "doorman", "building worker", "El portero abre el portal."),
  n("vecindario", "el", "masculine", "home_city_travel_nature", "neighborhood", "local area", "El vecindario es tranquilo."),
  n("barrio", "el", "masculine", "home_city_travel_nature", "district or neighborhood", "local area", "El barrio tiene un parque."),
  n("zona", "la", "feminine", "home_city_travel_nature", "area or zone", "city area", "La zona es segura."),
  n("señal", "la", "feminine", "home_city_travel_nature", "sign", "road sign", "La señal está en la carretera."),
  n("cartel", "el", "masculine", "home_city_travel_nature", "poster or sign", "public sign", "El cartel anuncia un concierto."),
  n("carril", "el", "masculine", "home_city_travel_nature", "lane", "road lane", "El carril está libre."),
  n("curva", "la", "feminine", "home_city_travel_nature", "curve", "road curve", "La curva es peligrosa."),
  n("rueda", "la", "feminine", "home_city_travel_nature", "wheel", "vehicle part", "La rueda está rota."),
  n("motor", "el", "masculine", "home_city_travel_nature", "engine", "vehicle part", "El motor no funciona."),
  n("camión", "el", "masculine", "home_city_travel_nature", "truck", "large vehicle", "El camión lleva cajas."),
  n("motocicleta", "la", "feminine", "home_city_travel_nature", "motorcycle", "vehicle", "La motocicleta está aparcada."),
  n("patinete", "el", "masculine", "home_city_travel_nature", "scooter", "small vehicle", "El patinete es eléctrico."),
  n("casco", "el", "masculine", "home_city_travel_nature", "helmet", "safety object", "El casco protege la cabeza."),
  n("vuelo", "el", "masculine", "home_city_travel_nature", "flight", "air travel", "El vuelo sale a las seis."),
  n("llegada", "la", "feminine", "home_city_travel_nature", "arrival", "travel arrival", "La llegada es a las ocho."),
  n("embarque", "el", "masculine", "home_city_travel_nature", "boarding", "airport boarding", "El embarque empieza pronto."),
  n("destino", "el", "masculine", "home_city_travel_nature", "destination", "travel destination", "El destino está lejos."),
  n("excursión", "la", "feminine", "home_city_travel_nature", "excursion", "short trip", "La excursión dura un día."),
  n("camping", "el", "masculine", "home_city_travel_nature", "camping site", "travel lodging", "El camping está cerca del río."),
  n("desierto", "el", "masculine", "home_city_travel_nature", "desert", "natural place", "El desierto es seco."),
  n("valle", "el", "masculine", "home_city_travel_nature", "valley", "natural place", "El valle tiene un río."),
  n("océano", "el", "masculine", "home_city_travel_nature", "ocean", "sea area", "El océano es grande."),
  n("planeta", "el", "masculine", "home_city_travel_nature", "planet", "space object", "La Tierra es un planeta."),
  n("luna", "la", "feminine", "home_city_travel_nature", "moon", "sky object", "La luna está clara."),
  n("estrella", "la", "feminine", "home_city_travel_nature", "star", "sky object", "La estrella brilla en el cielo."),
  n("trueno", "el", "masculine", "home_city_travel_nature", "thunder", "storm sound", "El trueno suena fuerte."),
  n("relámpago", "el", "masculine", "home_city_travel_nature", "lightning", "storm light", "El relámpago ilumina la noche."),
  n("fuego", "el", "masculine", "home_city_travel_nature", "fire", "hot flame", "El fuego está apagado."),
  n("humo", "el", "masculine", "home_city_travel_nature", "smoke", "smoke in air", "El humo sale de la cocina."),
  n("hierba", "la", "feminine", "home_city_travel_nature", "grass", "green ground", "La hierba está mojada."),
  n("insecto", "el", "masculine", "home_city_travel_nature", "insect", "small animal", "El insecto está en la pared."),
  n("mosquito", "el", "masculine", "home_city_travel_nature", "mosquito", "small insect", "El mosquito vuela cerca."),
  n("caballo", "el", "masculine", "home_city_travel_nature", "horse", "farm animal", "El caballo corre en el campo."),

  n("lenteja", "la", "feminine", "food_drink_shopping", "lentil", "food ingredient", "La lenteja está en la sopa."),
  n("garbanzo", "el", "masculine", "food_drink_shopping", "chickpea", "food ingredient", "El garbanzo está cocido."),
  n("frijol", "el", "masculine", "food_drink_shopping", "bean", "food ingredient", "El frijol está caliente."),
  n("judía", "la", "feminine", "food_drink_shopping", "bean", "food ingredient", "La judía está en la olla."),
  n("atún", "el", "masculine", "food_drink_shopping", "tuna", "fish food", "El atún está en la ensalada."),
  n("bacalao", "el", "masculine", "food_drink_shopping", "cod", "fish food", "El bacalao está salado."),
  n("salmón", "el", "masculine", "food_drink_shopping", "salmon", "fish food", "El salmón está fresco."),
  n("ternera", "la", "feminine", "food_drink_shopping", "veal or beef", "meat food", "La ternera está en el plato."),
  n("pavo", "el", "masculine", "food_drink_shopping", "turkey", "meat food", "El pavo está en el horno."),
  n("cordero", "el", "masculine", "food_drink_shopping", "lamb", "meat food", "El cordero está caliente."),
  n("albóndiga", "la", "feminine", "food_drink_shopping", "meatball", "food item", "La albóndiga tiene salsa."),
  n("croqueta", "la", "feminine", "food_drink_shopping", "croquette", "food item", "La croqueta está caliente."),
  n("empanada", "la", "feminine", "food_drink_shopping", "empanada", "food item", "La empanada tiene carne."),
  n("sándwich", "el", "masculine", "food_drink_shopping", "sandwich", "simple meal", "El sándwich tiene queso."),
  n("tarta", "la", "feminine", "food_drink_shopping", "cake or tart", "sweet food", "La tarta es de chocolate."),
  n("pastel", "el", "masculine", "food_drink_shopping", "cake", "sweet food", "El pastel está en la mesa."),
  n("bizcocho", "el", "masculine", "food_drink_shopping", "sponge cake", "sweet food", "El bizcocho está dulce."),
  n("caramelo", "el", "masculine", "food_drink_shopping", "candy", "sweet item", "El caramelo es pequeño."),
  n("chicle", "el", "masculine", "food_drink_shopping", "chewing gum", "sweet item", "El chicle está en el bolsillo."),
  n("limonada", "la", "feminine", "food_drink_shopping", "lemonade", "cold drink", "La limonada está fría."),
  n("refresco", "el", "masculine", "food_drink_shopping", "soft drink", "cold drink", "El refresco tiene hielo."),
  n("cerveza", "la", "feminine", "food_drink_shopping", "beer", "drink", "La cerveza está fría."),
  n("vino", "el", "masculine", "food_drink_shopping", "wine", "drink", "El vino está en la copa."),
  n("sidra", "la", "feminine", "food_drink_shopping", "cider", "drink", "La sidra está en la botella."),
  n("nata", "la", "feminine", "food_drink_shopping", "cream", "dairy food", "La nata está en el postre."),
  n("yema", "la", "feminine", "food_drink_shopping", "egg yolk", "egg part", "La yema es amarilla."),
  n("clara", "la", "feminine", "food_drink_shopping", "egg white", "egg part", "La clara está en el vaso."),
  n("masa", "la", "feminine", "food_drink_shopping", "dough", "cooking ingredient", "La masa está en la mesa."),
  n("fideo", "el", "masculine", "food_drink_shopping", "noodle", "food item", "El fideo está en la sopa."),
  n("caldo", "el", "masculine", "food_drink_shopping", "broth", "food liquid", "El caldo está caliente."),
  n("aperitivo", "el", "masculine", "food_drink_shopping", "appetizer", "small food", "El aperitivo llega primero."),
  n("aceituna", "la", "feminine", "food_drink_shopping", "olive", "food item", "La aceituna está en la tapa."),
  n("aguacate", "el", "masculine", "food_drink_shopping", "avocado", "fruit food", "El aguacate está maduro."),
  n("coco", "el", "masculine", "food_drink_shopping", "coconut", "fruit food", "El coco está abierto."),
  n("papaya", "la", "feminine", "food_drink_shopping", "papaya", "fruit food", "La papaya está dulce."),

  v("saludar", "-ar", "core_verbs_part004", "to greet", "greeting someone", "Saludo a mi vecino."),
  v("despedirse", "irregular", "core_verbs_part004", "to say goodbye", "leaving someone", "Me despido en la puerta."),
  v("disculparse", "-ar", "core_verbs_part004", "to apologize", "saying sorry", "Me disculpo por llegar tarde."),
  v("agradecer", "irregular", "core_verbs_part004", "to thank", "thanking someone", "Agradezco la ayuda."),
  v("intentar", "-ar", "core_verbs_part004", "to try", "trying an action", "Intento hablar despacio."),
  v("decidir", "-ir", "core_verbs_part004", "to decide", "choosing a plan", "Decido viajar mañana."),
  v("comprobar", "irregular", "core_verbs_part004", "to check", "checking a fact", "Compruebo la dirección."),
  v("comparar", "-ar", "core_verbs_part004", "to compare", "comparing prices", "Comparo dos precios."),
  v("utilizar", "-ar", "core_verbs_part004", "to use", "using a tool", "Utilizo el teclado."),
  v("funcionar", "-ar", "core_verbs_part004", "to work or function", "device working", "La impresora funciona bien."),
  v("costar", "irregular", "core_verbs_part004", "to cost", "price", "El billete cuesta poco."),
  v("medir", "irregular", "core_verbs_part004", "to measure", "measuring size", "Mido la mesa con la regla."),
  v("pesar", "-ar", "core_verbs_part004", "to weigh", "weighing food", "Peso la fruta en la tienda."),
  v("faltar", "-ar", "core_verbs_part004", "to be missing", "missing item", "Falta una silla."),
  v("sobrar", "-ar", "core_verbs_part004", "to be left over", "extra amount", "Sobra un poco de arroz."),
  v("organizar", "-ar", "core_verbs_part004", "to organize", "organizing a plan", "Organizo la reunión."),
  v("planear", "-ar", "core_verbs_part004", "to plan", "planning travel", "Planeo una excursión."),
  v("revisar", "-ar", "core_verbs_part004", "to review or check", "checking a document", "Reviso el contrato."),
  v("traducir", "irregular", "core_verbs_part004", "to translate", "translating a word", "Traduzco una frase."),
  v("pronunciar", "-ar", "core_verbs_part004", "to pronounce", "pronouncing a word", "Pronuncio la palabra despacio."),
  v("deletrear", "-ar", "core_verbs_part004", "to spell", "spelling a name", "Deletreo mi apellido."),
  v("mejorar", "-ar", "core_verbs_part004", "to improve", "getting better", "Mejoro mi español cada día."),
  v("empeorar", "-ar", "core_verbs_part004", "to get worse", "worse situation", "El tiempo empeora por la tarde."),
  v("molestar", "-ar", "core_verbs_part004", "to bother", "annoying sound", "El ruido molesta a mi familia."),
  v("prestar", "-ar", "core_verbs_part004", "to lend", "lending an object", "Presto mi lápiz a Ana."),
  v("devolver", "irregular", "core_verbs_part004", "to return", "returning an object", "Devuelvo el libro mañana."),
  v("recoger", "irregular", "core_verbs_part004", "to pick up", "collecting an object", "Recojo la ropa limpia."),
  v("tirar", "-ar", "core_verbs_part004", "to throw away or pull", "throwing trash", "Tiro la basura en la papelera."),
  v("empujar", "-ar", "core_verbs_part004", "to push", "pushing a door", "Empujo la puerta despacio."),
  v("apretar", "irregular", "core_verbs_part004", "to press", "pressing a button", "Aprieto el botón."),
  v("encender", "irregular", "core_verbs_part004", "to turn on", "turning on a device", "Enciendo la luz."),
  v("apagar", "-ar", "core_verbs_part004", "to turn off", "turning off a device", "Apago la televisión."),
  v("conectar", "-ar", "core_verbs_part004", "to connect", "connecting a cable", "Conecto el cable al ordenador."),
  v("desconectar", "-ar", "core_verbs_part004", "to disconnect", "disconnecting a cable", "Desconecto el cargador."),
  v("imprimir", "-ir", "core_verbs_part004", "to print", "printing a document", "Imprimo el documento."),
  v("copiar", "-ar", "core_verbs_part004", "to copy", "copying text", "Copio la frase en el cuaderno."),
  v("pegar", "-ar", "core_verbs_part004", "to paste or stick", "pasting text", "Pego el texto en la página."),
  v("descargar", "-ar", "core_verbs_part004", "to download", "downloading a file", "Descargo el archivo."),
  v("cargar", "-ar", "core_verbs_part004", "to charge or load", "charging a device", "Cargo el móvil por la noche."),
  v("navegar", "-ar", "core_verbs_part004", "to browse or sail", "using the internet", "Navego por internet."),

  adj("amable", "adjectives_part004", "kind", "kind person", "La vendedora es amable."),
  adj("simpático", "adjectives_part004", "nice or friendly", "friendly person", "El taxista es simpático."),
  adj("antipático", "adjectives_part004", "unfriendly", "unfriendly person", "El camarero parece antipático."),
  adj("agradable", "adjectives_part004", "pleasant", "pleasant place", "El barrio es agradable."),
  adj("desagradable", "adjectives_part004", "unpleasant", "unpleasant smell", "El olor es desagradable."),
  adj("educado", "adjectives_part004", "polite", "polite person", "El niño es educado."),
  adj("maleducado", "adjectives_part004", "rude", "rude person", "El cliente es maleducado."),
  adj("puntual", "adjectives_part004", "punctual", "arriving on time", "La doctora es puntual."),
  adj("impuntual", "adjectives_part004", "late or unpunctual", "arriving late", "El estudiante es impuntual."),
  adj("roto", "adjectives_part004", "broken", "broken object", "El vaso está roto."),
  adj("mojado", "adjectives_part004", "wet", "wet clothing", "El guante está mojado."),
  adj("seco", "adjectives_part004", "dry", "dry object", "El suelo está seco."),
  adj("húmedo", "adjectives_part004", "damp", "damp towel", "La toalla está húmeda."),
  adj("estrecho", "adjectives_part004", "narrow", "narrow street", "La calle es estrecha."),
  adj("ancho", "adjectives_part004", "wide", "wide road", "La carretera es ancha."),
  adj("profundo", "adjectives_part004", "deep", "deep water", "El lago es profundo."),
  adj("brillante", "adjectives_part004", "bright or shiny", "bright light", "La luz es brillante."),
  adj("apagado", "adjectives_part004", "off", "device off", "El teléfono está apagado."),
  adj("encendido", "adjectives_part004", "on", "device on", "La pantalla está encendida."),
  adj("duro", "adjectives_part004", "hard", "hard chair", "La silla es dura."),
  adj("blando", "adjectives_part004", "soft", "soft bread", "El pan está blando."),
  adj("suave", "adjectives_part004", "soft or gentle", "soft fabric", "La bufanda es suave."),
  adj("ruidoso", "adjectives_part004", "noisy", "noisy place", "El barrio es ruidoso."),
  adj("silencioso", "adjectives_part004", "quiet", "quiet room", "La habitación es silenciosa."),
  adj("delicioso", "adjectives_part004", "delicious", "tasty food", "La tarta está deliciosa."),

  n("vaca", "la", "feminine", "home_city_travel_nature", "cow", "farm animal", "La vaca está en el campo."),
  n("oveja", "la", "feminine", "home_city_travel_nature", "sheep", "farm animal", "La oveja come hierba."),
  n("gallina", "la", "feminine", "home_city_travel_nature", "hen", "farm bird", "La gallina está en el patio."),
  n("conejo", "el", "masculine", "home_city_travel_nature", "rabbit", "small animal", "El conejo corre en el jardín."),
  n("abeja", "la", "feminine", "home_city_travel_nature", "bee", "small insect", "La abeja está en la flor."),
  n("mosca", "la", "feminine", "home_city_travel_nature", "fly", "small insect", "La mosca está en la ventana."),
  n("hormiga", "la", "feminine", "home_city_travel_nature", "ant", "small insect", "La hormiga lleva comida."),
  n("ciruela", "la", "feminine", "food_drink_shopping", "plum", "fruit food", "La ciruela está madura."),
  n("higo", "el", "masculine", "food_drink_shopping", "fig", "fruit food", "El higo está dulce."),
  n("calabaza", "la", "feminine", "food_drink_shopping", "pumpkin", "vegetable food", "La calabaza está en la cocina."),
  n("apio", "el", "masculine", "food_drink_shopping", "celery", "vegetable food", "El apio está fresco."),
  n("puerro", "el", "masculine", "food_drink_shopping", "leek", "vegetable food", "El puerro está en la sopa."),
  n("pimiento", "el", "masculine", "food_drink_shopping", "pepper", "vegetable food", "El pimiento es rojo."),
  n("canela", "la", "feminine", "food_drink_shopping", "cinnamon", "spice", "La canela está en el postre."),
  n("vainilla", "la", "feminine", "food_drink_shopping", "vanilla", "flavor", "La vainilla huele bien."),
  v("estacionar", "-ar", "core_verbs_part004", "to park", "parking a car", "Estaciono el coche cerca."),
  v("frenar", "-ar", "core_verbs_part004", "to brake", "driving action", "Freno antes de la curva."),
  v("girar", "-ar", "core_verbs_part004", "to turn", "changing direction", "Giro a la derecha."),
  v("volar", "irregular", "core_verbs_part004", "to fly", "air travel", "Vuelo a Lima mañana."),
  v("aterrizar", "-ar", "core_verbs_part004", "to land", "plane landing", "El avión aterriza pronto."),
  v("nacer", "irregular", "core_verbs_part004", "to be born", "birth", "El bebé nace en mayo."),
  v("morir", "irregular", "core_verbs_part004", "to die", "end of life", "La planta muere sin agua."),
  v("crecer", "irregular", "core_verbs_part004", "to grow", "growing child", "El niño crece rápido."),
  v("secar", "-ar", "core_verbs_part004", "to dry", "drying clothes", "Seco la ropa al sol."),
  v("planchar", "-ar", "core_verbs_part004", "to iron", "ironing clothes", "Plancho la camisa."),
  v("barrer", "-er", "core_verbs_part004", "to sweep", "cleaning floor", "Barro el suelo por la mañana."),
  v("ducharse", "-ar", "core_verbs_part004", "to shower", "daily routine", "Me ducho antes de cenar."),
  v("vestirse", "irregular", "core_verbs_part004", "to get dressed", "daily routine", "Me visto en el dormitorio."),
  v("peinarse", "-ar", "core_verbs_part004", "to comb hair", "daily routine", "Me peino frente al espejo."),
  v("afeitarse", "-ar", "core_verbs_part004", "to shave", "personal care", "Me afeito por la mañana."),
  v("maquillarse", "-ar", "core_verbs_part004", "to put on makeup", "personal care", "Me maquillo para la fiesta."),
  v("bañarse", "-ar", "core_verbs_part004", "to bathe", "personal care", "Me baño por la noche."),
  v("acostarse", "irregular", "core_verbs_part004", "to go to bed", "daily routine", "Me acuesto temprano."),
  v("despertarse", "irregular", "core_verbs_part004", "to wake up", "daily routine", "Me despierto a las siete."),
  v("sonreír", "-ir", "core_verbs_part004", "to smile", "friendly action", "Sonrío cuando veo a mi amiga."),
  adj("amargo", "adjectives_part004", "bitter", "bitter food", "El café está amargo."),
  adj("ácido", "adjectives_part004", "acidic or sour", "sour fruit", "El limón es ácido."),
  adj("fresco", "adjectives_part004", "fresh", "fresh food", "El pescado está fresco."),
  adj("maduro", "adjectives_part004", "ripe", "ripe fruit", "El mango está maduro."),
  adj("crudo", "adjectives_part004", "raw", "raw food", "La carne está cruda."),
  adj("cocido", "adjectives_part004", "cooked or boiled", "cooked food", "El arroz está cocido."),
  adj("útil", "adjectives_part004", "useful", "useful object", "El mapa es útil."),
  adj("normal", "adjectives_part004", "normal", "ordinary situation", "La situación es normal."),
  adj("raro", "adjectives_part004", "strange or rare", "strange sound", "El ruido es raro."),
  adj("perfecto", "adjectives_part004", "perfect", "perfect answer", "La respuesta es perfecta."),
];

const TSV_HEADERS = [
  "part_of_speech",
  "source_lemma",
  "display_ES",
  "display_ES_419",
  "article_ES",
  "article_ES_419",
  "gender",
  "number_policy",
  "verb_infinitive",
  "verb_group",
  "meaning_note",
  "semantic_scene",
  "topic_domain",
  "example_ES",
  "example_ES_419",
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assertNoTsvBreaks(value, label) {
  const text = String(value ?? "");
  if (text.includes("\t") || text.includes("\n") || text.includes("\r")) {
    throw new Error(`${label} contains a TSV-breaking character.`);
  }
}

function candidateKey(candidate) {
  return `${normalizeText(candidate.source_lemma).toLocaleLowerCase("es")}::${normalizeText(candidate.part_of_speech)}`;
}

async function existingSpanishKeys() {
  const paths = [
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_001_300_v1_candidate_pool.jsonl"),
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_002_300_v1_candidate_pool.jsonl"),
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_003_300_v1_candidate_pool.jsonl"),
  ];
  const keys = new Set();
  for (const filePath of paths) {
    if (!(await pathExists(filePath))) {
      throw new Error(`Required previous Spanish A1 candidate pool missing: ${path.relative(ROOT, filePath)}`);
    }
    const rows = await readJsonl(filePath);
    for (const candidate of rows) {
      keys.add(`${normalizeText(candidate.source_lemma).toLocaleLowerCase("es")}::${normalizeText(candidate.part_of_speech)}`);
    }
  }
  return keys;
}

function validateCandidateShape(candidate, index) {
  for (const header of TSV_HEADERS) {
    if (!normalizeText(candidate[header])) {
      throw new Error(`candidateBacklog[${index}] ${candidate.source_lemma} missing ${header}.`);
    }
    assertNoTsvBreaks(candidate[header], `candidateBacklog[${index}] ${candidate.source_lemma}.${header}`);
  }
}

function selectEntries(existingKeys) {
  const seenBacklogKeys = new Map();
  const selected = [];
  const skippedPrevious = [];

  for (const [index, candidate] of candidateBacklog.entries()) {
    validateCandidateShape(candidate, index);
    const key = candidateKey(candidate);
    if (seenBacklogKeys.has(key)) {
      throw new Error(`Duplicate Part 004 backlog source lemma/POS: ${key} at rows ${seenBacklogKeys.get(key)} and ${index + 1}.`);
    }
    seenBacklogKeys.set(key, index + 1);
    if (existingKeys.has(key)) {
      skippedPrevious.push(key);
      continue;
    }
    if (selected.length < 300) selected.push(candidate);
  }

  if (selected.length !== 300) {
    throw new Error(`Part 004 selected ${selected.length} non-overlapping entries, expected 300. Backlog=${candidateBacklog.length}, skipped_previous=${skippedPrevious.length}.`);
  }
  return { selected, skippedPrevious };
}

function toTsv(entries) {
  return [
    TSV_HEADERS.join("\t"),
    ...entries.map((candidate) => TSV_HEADERS.map((header) => normalizeText(candidate[header])).join("\t")),
    "",
  ].join("\n");
}

function resetContract(part003) {
  return {
    contract_id: "spanish_a1_core_release_contract_v1::spanish_a1_core_part_004_300_v1",
    status: "source_candidate_scaffold_ready",
    scope:
      "Spanish A1 course-prep vocabulary release workbook Part 004, separate from ordinary thematic decks, Oxford English vocabulary, HSK Classic and HSK 3.0; final buyer-facing delivery requires separate Spanish (Spain) and Latin American Spanish edition workbooks.",
    approved_for_generation: false,
    source_candidate_file: "config/spanish-a1-core-part-004-candidates.tsv",
    release_part: {
      part_number: 4,
      row_id_start: 901,
      meaning_namespace: "spanish_a1::part_004",
      selected_scope:
        "Internal LunaCards continuation of Spanish A1 Core after Parts 001-003; additional A1/A1+ function words, numbers, people, work, school, office/digital, body/health/clothing, home/city/travel/nature, food/shopping, common verbs and adjectives.",
    },
    default_release: {
      release_id: RELEASE_ID,
      course_id: "spanish_a1_core",
      cefr_level: "A1",
      expected_row_count: 300,
    },
    course: part003.course,
    source_policy: part003.source_policy,
    row_identity: part003.row_identity,
    field_rules: part003.field_rules,
    workbook: {
      ...part003.workbook,
      main_sheet_name: "Spanish A1 Core Part 004",
      postgres_import: false,
      ordinary_deck_sort: null,
      isolated_db_storage: {
        ...part003.workbook.isolated_db_storage,
        source_only_saved: false,
        final_support_storage_ready: false,
      },
      google_sheet_created: false,
      final_delivery_ready: false,
    },
    qa_gates: part003.qa_gates,
    ai_tool_policy: {
      ...part003.ai_tool_policy,
      latest_explicit_user_confirmation: null,
      part004_note:
        "No Part 004 live Gemini/support-language generation approval is inherited from earlier parts. Subscription-backed Gemini CLI use must be explicitly confirmed before live generation.",
    },
    current_blockers: [],
    current_pending: [
      "candidate_pool_build",
      "spanish_source_lookup",
      "source_advisory_review_if_needed",
      "source_draft_workbook",
      "source_draft_readback",
      "support_generation_plan",
      "support_translation_memory_reuse_map",
      "explicit_gemini_quota_confirmation_before_live_support_generation",
      "support_language_generation",
      "spanish_a1_gates",
      "final_two_edition_workbook_export",
      "native_google_sheet_upload_and_readback",
      "sample_quality_audit",
      "isolated_spanish_a1_db_import_and_readback",
      "final_release_gate",
    ],
    updated_at: new Date().toISOString(),
  };
}

function resetMetadata(source, { edition }) {
  return {
    ...source,
    release_id: RELEASE_ID,
    description: `Polished localized Course Metadata for the Spanish A1 Core ${PART_LABEL} ${edition} buyer-facing workbook. Keys use spreadsheetCode values from config/language-order.json.`,
  };
}

async function main() {
  const existingKeys = await existingSpanishKeys();
  const { selected, skippedPrevious } = selectEntries(existingKeys);
  await fs.writeFile(CANDIDATE_PATH, toTsv(selected), "utf8");

  const part003 = await readJson(path.join(ROOT, "config/spanish-a1-core-part-003-release-contract-v1.json"));
  await writeJson(CONTRACT_PATH, resetContract(part003));

  const latamMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-003-course-metadata.json"));
  const spainMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-003-course-metadata-spain.json"));
  await writeJson(LATAM_METADATA_PATH, resetMetadata(latamMetadata, { edition: "Latin American Spanish" }));
  await writeJson(SPAIN_METADATA_PATH, resetMetadata(spainMetadata, { edition: "Spanish (Spain)" }));

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        backlog_candidates: candidateBacklog.length,
        candidates: selected.length,
        skipped_previous_duplicates: skippedPrevious.length,
        candidate_file: path.relative(ROOT, CANDIDATE_PATH),
        contract: path.relative(ROOT, CONTRACT_PATH),
        metadata: [path.relative(ROOT, LATAM_METADATA_PATH), path.relative(ROOT, SPAIN_METADATA_PATH)],
      },
      null,
      2
    )
  );
}

await main();
