#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "spanish_a1_core_part_003_300_v1";
const PART_LABEL = "Part 003";
const CONTRACT_PATH = path.join(ROOT, "config/spanish-a1-core-part-003-release-contract-v1.json");
const CANDIDATE_PATH = path.join(ROOT, "config/spanish-a1-core-part-003-candidates.tsv");
const LATAM_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-003-course-metadata.json");
const SPAIN_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-003-course-metadata-spain.json");

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

function v(lemma, group, domain, note, scene, exampleES, exampleES419 = exampleES) {
  return row("verb", lemma, lemma, lemma, "not_applicable", "not_applicable", "not_applicable", "not_applicable", lemma, group, note, scene, domain, exampleES, exampleES419);
}

function adj(lemma, domain, note, scene, exampleES, exampleES419 = exampleES) {
  return x("adjective", lemma, domain, note, scene, exampleES, exampleES419);
}

const entries = [
  x("conjunction", "ni", "grammar_function_words", "neither nor", "negative choice", "No quiero ni café ni té."),
  x("conjunction", "aunque", "grammar_function_words", "although", "simple contrast", "Salgo aunque hace frío."),
  x("conjunction", "mientras", "grammar_function_words", "while", "two actions at the same time", "Leo mientras espero."),
  x("adverb", "entonces", "grammar_function_words", "then", "next step in a plan", "Entonces vamos a casa."),
  x("adverb", "casi", "grammar_function_words", "almost", "nearly complete", "Casi termino la tarea."),
  x("adverb", "quizás", "grammar_function_words", "perhaps", "uncertain plan", "Quizás voy al cine."),
  x("adverb", "además", "grammar_function_words", "also or besides", "adding information", "Además, necesito agua."),
  x("adverb", "solo", "grammar_function_words", "alone or only", "doing something alone", "Voy solo al parque."),
  x("adverb", "bastante", "grammar_function_words", "quite or enough", "moderate degree", "La sopa está bastante caliente."),
  x("adverb", "demasiado", "grammar_function_words", "too much", "excessive amount", "El bolso pesa demasiado."),
  x("adverb", "así", "grammar_function_words", "like this", "showing manner", "Hazlo así, por favor."),
  x("adverb", "adelante", "location_direction", "forward or ahead", "moving forward", "Camina adelante con cuidado."),
  x("adverb", "atrás", "location_direction", "back or behind", "moving back", "Da un paso atrás."),
  x("adverb", "dentro", "location_direction", "inside", "inside a place", "El gato está dentro."),
  x("adverb", "fuera", "location_direction", "outside", "outside a place", "Los niños juegan fuera."),
  x("adverb", "arriba", "location_direction", "upstairs or above", "place above", "La lámpara está arriba."),
  x("adverb", "abajo", "location_direction", "downstairs or below", "place below", "El baño está abajo."),
  x("adverb", "delante", "location_direction", "in front", "place in front", "El taxi está delante."),
  x("adverb", "detrás", "location_direction", "behind", "place behind", "La maleta está detrás."),
  x("adverb", "junto", "location_direction", "together or next to", "near another thing", "Estoy junto a la puerta."),
  x("adverb", "alrededor", "location_direction", "around", "around a place", "Hay sillas alrededor."),
  x("adverb", "enfrente", "location_direction", "opposite or across", "opposite location", "La farmacia está enfrente."),
  n("derecha", "la", "feminine", "location_direction", "right side", "turning right", "La derecha está al final."),
  n("izquierda", "la", "feminine", "location_direction", "left side", "turning left", "La izquierda está cerca."),
  n("norte", "el", "masculine", "location_direction", "north", "map direction", "El norte está en el mapa."),
  n("sur", "el", "masculine", "location_direction", "south", "map direction", "El sur está abajo en el mapa."),
  n("oeste", "el", "masculine", "location_direction", "west", "map direction", "El oeste está a la izquierda."),
  n("centro", "el", "masculine", "location_direction", "center", "city center", "El centro está cerca."),
  x("adverb", "ahí", "location_direction", "there nearby", "pointing nearby", "La bolsa está ahí."),
  x("adverb", "tampoco", "grammar_function_words", "neither or not either", "negative addition", "Yo tampoco tengo coche."),
  x("adverb", "exactamente", "grammar_function_words", "exactly", "exact answer", "Exactamente, son diez euros."),
  x("adverb", "gratis", "shopping_services", "free of charge", "free service", "La entrada es gratis."),
  adj("suficiente", "grammar_function_words", "sufficient", "enough quantity", "Tengo dinero suficiente."),
  x("ordinal", "tercero", "numbers_order", "third", "order in a line", "Soy el tercero en la fila."),
  adj("último", "numbers_order", "last", "last item", "El último tren sale tarde."),
  adj("próximo", "time_basics", "next", "next week", "La próxima clase es el lunes."),
  adj("anterior", "time_basics", "previous", "previous day", "El día anterior fue tranquilo."),
  x("pronoun", "alguno", "grammar_function_words", "any or one", "asking if one exists", "¿Hay alguno libre?"),
  x("pronoun", "ninguno", "grammar_function_words", "none", "no item available", "No hay ninguno libre."),
  x("determiner", "varios", "grammar_function_words", "several", "several people", "Varios estudiantes esperan."),
  x("determiner", "cualquier", "grammar_function_words", "any", "any option", "Cualquier día está bien."),
  x("pronoun", "ambos", "grammar_function_words", "both", "two people together", "Ambos viven cerca."),
  x("adverb", "más", "degree_basics", "more", "asking for more", "Quiero más agua."),
  x("adverb", "menos", "degree_basics", "less", "smaller amount", "Como menos pan."),
  x("pronoun", "algo", "grammar_function_words", "something", "something needed", "Necesito algo para escribir."),
  x("pronoun", "nada", "grammar_function_words", "nothing", "nothing available", "No veo nada aquí."),
  x("pronoun", "alguien", "grammar_function_words", "someone", "someone calling", "Alguien llama a la puerta."),
  x("pronoun", "nadie", "grammar_function_words", "nobody", "empty place", "No hay nadie en casa."),

  n("nombre", "el", "masculine", "people_identity", "first name or name", "name on a form", "Escribo mi nombre en el formulario."),
  n("apellido", "el", "masculine", "people_identity", "surname", "surname on a form", "Mi apellido es García."),
  n("edad", "la", "feminine", "people_identity", "age", "age on a form", "La edad está en el carné."),
  n("nacionalidad", "la", "feminine", "people_identity", "nationality", "nationality on a form", "Mi nacionalidad es mexicana."),
  n("idioma", "el", "masculine", "people_identity", "language", "language choice", "El idioma de la clase es español."),
  n("lengua", "la", "feminine", "people_identity", "language or tongue", "language at home", "Mi lengua es el español."),
  n("turista", "not_applicable", "common", "people_travel", "tourist", "tourist in a city", "El turista mira el mapa."),
  n("visitante", "not_applicable", "common", "people_travel", "visitor", "visitor at a museum", "La visitante entra al museo."),
  n("camarero", "el", "masculine", "people_food_services", "waiter", "waiter in a cafe", "El camarero trae la cuenta."),
  n("camarera", "la", "feminine", "people_food_services", "waitress", "waitress in a cafe", "La camarera sirve café."),
  n("cocinero", "el", "masculine", "people_food_services", "male cook", "cook in a kitchen", "El cocinero prepara arroz."),
  n("cocinera", "la", "feminine", "people_food_services", "female cook", "cook in a kitchen", "La cocinera prepara sopa."),
  n("recepcionista", "not_applicable", "common", "people_services", "receptionist", "hotel reception", "La recepcionista da la llave."),
  n("dependiente", "el", "masculine", "people_services", "male shop assistant", "shop assistant at work", "El dependiente vende zapatos."),
  n("dependienta", "la", "feminine", "people_services", "female shop assistant", "shop assistant at work", "La dependienta ayuda al cliente."),
  n("conductor", "el", "masculine", "people_transport", "male driver", "driver in a taxi", "El conductor espera en el taxi."),
  n("conductora", "la", "feminine", "people_transport", "female driver", "driver in a bus", "La conductora abre la puerta."),
  n("policía", "not_applicable", "common", "people_services", "police officer", "police officer in street", "El policía está en la esquina."),
  n("actor", "el", "masculine", "people_leisure", "actor", "actor at a theater", "El actor habla en el teatro."),
  n("actriz", "la", "feminine", "people_leisure", "actress", "actress at a theater", "La actriz canta bien."),
  n("músico", "el", "masculine", "people_leisure", "musician", "musician in a plaza", "El músico toca la guitarra."),
  n("cantante", "not_applicable", "common", "people_leisure", "singer", "singer at a concert", "La cantante canta una canción."),
  n("artista", "not_applicable", "common", "people_leisure", "artist", "artist drawing", "El artista dibuja una flor."),
  n("dentista", "not_applicable", "common", "people_health", "dentist", "dentist appointment", "La dentista mira el diente."),
  n("periodista", "not_applicable", "common", "people_work", "journalist", "journalist writing", "El periodista escribe una noticia."),

  n("cuello", "el", "masculine", "body_health_hygiene", "neck", "neck pain", "Me duele el cuello."),
  n("hombro", "el", "masculine", "body_health_hygiene", "shoulder", "shoulder pain", "Me duele el hombro."),
  n("pecho", "el", "masculine", "body_health_hygiene", "chest", "chest body part", "Me duele el pecho."),
  n("dedo", "el", "masculine", "body_health_hygiene", "finger or toe", "finger on hand", "Me corto un dedo."),
  n("uña", "la", "feminine", "body_health_hygiene", "nail", "clean nail", "La uña está limpia."),
  n("rodilla", "la", "feminine", "body_health_hygiene", "knee", "knee pain", "Me duele la rodilla."),
  n("labio", "el", "masculine", "body_health_hygiene", "lip", "dry lip", "El labio está seco."),
  n("piel", "la", "feminine", "body_health_hygiene", "skin", "healthy skin", "La piel está sana."),
  n("barba", "la", "feminine", "body_health_hygiene", "beard", "beard on a man", "Mi padre tiene barba."),
  n("bigote", "el", "masculine", "body_health_hygiene", "mustache", "mustache on face", "El señor tiene bigote."),
  n("ceja", "la", "feminine", "body_health_hygiene", "eyebrow", "eyebrow above eye", "La ceja está sobre el ojo."),
  n("pestaña", "la", "feminine", "body_health_hygiene", "eyelash", "eyelash near eye", "La pestaña está junto al ojo."),
  n("cintura", "la", "feminine", "body_health_hygiene", "waist", "waist pain", "Tengo dolor en la cintura."),
  n("tobillo", "el", "masculine", "body_health_hygiene", "ankle", "ankle pain", "Me duele el tobillo."),
  n("hueso", "el", "masculine", "body_health_hygiene", "bone", "bone in body", "El hueso está en la pierna."),
  n("músculo", "el", "masculine", "body_health_hygiene", "muscle", "muscle after exercise", "El músculo duele después de correr."),
  n("garganta", "la", "feminine", "body_health_hygiene", "throat", "sore throat", "Me duele la garganta."),
  n("alergia", "la", "feminine", "body_health_hygiene", "allergy", "health problem", "Tengo alergia al polvo."),
  n("gripe", "la", "feminine", "body_health_hygiene", "flu", "being sick", "Tengo gripe esta semana."),
  n("resfriado", "el", "masculine", "body_health_hygiene", "cold illness", "minor illness", "Tengo un resfriado."),
  n("herida", "la", "feminine", "body_health_hygiene", "wound", "small wound", "La herida es pequeña."),
  n("accidente", "el", "masculine", "body_health_hygiene", "accident", "street accident", "Hay un accidente en la calle."),
  n("ambulancia", "la", "feminine", "body_health_hygiene", "ambulance", "emergency vehicle", "La ambulancia llega pronto."),
  n("crema", "la", "feminine", "body_health_hygiene", "cream", "skin cream", "La crema está en el baño."),
  n("venda", "la", "feminine", "body_health_hygiene", "bandage", "bandage on hand", "La venda está en la mano."),
  n("termómetro", "el", "masculine", "body_health_hygiene", "thermometer", "checking fever", "El termómetro marca fiebre."),
  n("vacuna", "la", "feminine", "body_health_hygiene", "vaccine", "health appointment", "La vacuna es importante."),
  n("dieta", "la", "feminine", "body_health_hygiene", "diet", "healthy eating", "La dieta tiene fruta."),
  n("cepillo", "el", "masculine", "body_health_hygiene", "brush", "toothbrush or brush", "El cepillo está en el lavabo."),
  n("dentífrico", "el", "masculine", "body_health_hygiene", "toothpaste", "toothpaste in bathroom", "El dentífrico está abierto."),
  n("peine", "el", "masculine", "body_health_hygiene", "comb", "comb in bag", "El peine está en el bolso."),
  n("desodorante", "el", "masculine", "body_health_hygiene", "deodorant", "bathroom item", "El desodorante está en el baño."),
  n("perfume", "el", "masculine", "body_health_hygiene", "perfume", "small bottle", "El perfume está en la mesa."),
  n("pañuelo", "el", "masculine", "body_health_hygiene", "tissue or handkerchief", "using a tissue", "Necesito un pañuelo."),
  n("descanso", "el", "masculine", "body_health_hygiene", "rest or break", "short rest", "El descanso dura diez minutos."),

  n("edificio", "el", "masculine", "home_city_travel_nature", "building", "building in city", "El edificio es alto."),
  n("portal", "el", "masculine", "home_city_travel_nature", "building entrance", "building entrance", "El portal está cerrado."),
  n("terraza", "la", "feminine", "home_city_travel_nature", "terrace", "terrace at home", "La terraza tiene una mesa."),
  n("patio", "el", "masculine", "home_city_travel_nature", "patio or courtyard", "outside area", "El patio tiene flores."),
  n("sótano", "el", "masculine", "home_city_travel_nature", "basement", "room below", "El sótano está abajo."),
  n("tejado", "el", "masculine", "home_city_travel_nature", "roof", "roof of house", "El tejado es rojo."),
  n("chimenea", "la", "feminine", "home_city_travel_nature", "fireplace or chimney", "home heating", "La chimenea está en la sala."),
  n("timbre", "el", "masculine", "home_city_travel_nature", "doorbell", "ringing bell", "El timbre suena fuerte."),
  n("llavero", "el", "masculine", "home_city_travel_nature", "key ring", "keys together", "El llavero tiene dos llaves."),
  n("basura", "la", "feminine", "home_city_travel_nature", "trash", "trash in kitchen", "La basura está en la cocina."),
  n("papelera", "la", "feminine", "home_city_travel_nature", "wastebasket", "trash bin", "La papelera está llena."),
  n("fregadero", "el", "masculine", "home_city_travel_nature", "sink", "kitchen sink", "El fregadero está limpio."),
  n("grifo", "el", "masculine", "home_city_travel_nature", "tap or faucet", "water tap", "El grifo tiene agua fría."),
  n("bañera", "la", "feminine", "home_city_travel_nature", "bathtub", "bathroom object", "La bañera está limpia."),
  n("lavabo", "el", "masculine", "home_city_travel_nature", "washbasin", "bathroom sink", "El lavabo está junto al espejo."),
  n("inodoro", "el", "masculine", "home_city_travel_nature", "toilet", "bathroom fixture", "El inodoro está en el baño."),
  n("avenida", "la", "feminine", "home_city_travel_nature", "avenue", "city street", "La avenida es larga."),
  n("carretera", "la", "feminine", "home_city_travel_nature", "road", "road outside city", "La carretera va al pueblo."),
  n("rotonda", "la", "feminine", "home_city_travel_nature", "roundabout", "road intersection", "La rotonda está cerca."),
  n("túnel", "el", "masculine", "home_city_travel_nature", "tunnel", "road tunnel", "El túnel es oscuro."),
  n("andén", "el", "masculine", "home_city_travel_nature", "platform", "train platform", "El tren sale del andén."),
  n("taquilla", "la", "feminine", "home_city_travel_nature", "ticket office", "buying a ticket", "La taquilla abre a las nueve."),
  n("equipaje", "el", "masculine", "home_city_travel_nature", "luggage", "travel bags", "El equipaje está en el hotel."),
  n("hostal", "el", "masculine", "home_city_travel_nature", "hostel", "cheap lodging", "El hostal es barato."),
  n("reserva", "la", "feminine", "home_city_travel_nature", "reservation", "hotel reservation", "La reserva está confirmada."),
  n("mar", "el", "masculine", "home_city_travel_nature", "sea", "sea near beach", "El mar está tranquilo."),
  n("bosque", "el", "masculine", "home_city_travel_nature", "forest", "walking in forest", "El bosque tiene muchos árboles."),
  n("campo", "el", "masculine", "home_city_travel_nature", "countryside or field", "outside city", "El campo está verde."),
  n("isla", "la", "feminine", "home_city_travel_nature", "island", "island travel", "La isla está lejos."),
  n("costa", "la", "feminine", "home_city_travel_nature", "coast", "coastal place", "La costa tiene playas."),
  n("arena", "la", "feminine", "home_city_travel_nature", "sand", "sand on beach", "La arena está caliente."),
  n("piedra", "la", "feminine", "home_city_travel_nature", "stone", "stone on path", "La piedra está en el camino."),
  n("árbol", "el", "masculine", "home_city_travel_nature", "tree", "tree in park", "El árbol da sombra."),
  n("flor", "la", "feminine", "home_city_travel_nature", "flower", "flower in garden", "La flor es amarilla."),
  n("hoja", "la", "feminine", "home_city_travel_nature", "leaf", "leaf on tree", "La hoja está verde."),
  n("planta", "la", "feminine", "home_city_travel_nature", "plant", "plant at home", "La planta necesita agua."),
  n("animal", "el", "masculine", "home_city_travel_nature", "animal", "animal in park", "El animal bebe agua."),
  n("perro", "el", "masculine", "home_city_travel_nature", "dog", "dog at home", "El perro duerme en casa."),
  n("gato", "el", "masculine", "home_city_travel_nature", "cat", "cat in house", "El gato está en la silla."),
  n("pájaro", "el", "masculine", "home_city_travel_nature", "bird", "bird in tree", "El pájaro canta en el árbol."),
  n("pez", "el", "masculine", "home_city_travel_nature", "fish as animal", "fish in water", "El pez nada en el río."),
  n("tormenta", "la", "feminine", "home_city_travel_nature", "storm", "bad weather", "La tormenta llega por la tarde."),
  n("niebla", "la", "feminine", "home_city_travel_nature", "fog", "foggy morning", "La niebla está en la carretera."),
  n("hielo", "el", "masculine", "home_city_travel_nature", "ice", "ice in glass", "El hielo está en el vaso."),
  n("sombra", "la", "feminine", "home_city_travel_nature", "shade or shadow", "shade under tree", "La sombra está bajo el árbol."),
  n("peluquería", "la", "feminine", "home_city_travel_nature", "hair salon", "service place", "La peluquería abre hoy."),
  n("buzón", "el", "masculine", "home_city_travel_nature", "mailbox", "mailbox at street", "El buzón está en la esquina."),
  n("sello", "el", "masculine", "home_city_travel_nature", "stamp", "stamp on letter", "El sello está en la carta."),
  n("formulario", "el", "masculine", "home_city_travel_nature", "form", "form on desk", "El formulario está completo."),
  n("firma", "la", "feminine", "home_city_travel_nature", "signature", "signature on form", "La firma está al final."),
  n("carné", "el", "masculine", "home_city_travel_nature", "identity card", "card in wallet", "El carné está en la cartera."),
  n("licencia", "la", "feminine", "home_city_travel_nature", "license", "driver license", "La licencia está vigente."),
  n("cajero", "el", "masculine", "home_city_travel_nature", "cash machine or cashier", "cash machine", "El cajero está junto al banco."),
  n("moneda", "la", "feminine", "home_city_travel_nature", "coin", "coin in pocket", "La moneda está en el bolsillo."),
  n("frontera", "la", "feminine", "home_city_travel_nature", "border", "country border", "La frontera está lejos."),
  n("aduana", "la", "feminine", "home_city_travel_nature", "customs", "airport customs", "La aduana está en el aeropuerto."),
  n("gasolinera", "la", "feminine", "home_city_travel_nature", "gas station", "fuel station", "La gasolinera está abierta."),
  n("autopista", "la", "feminine", "home_city_travel_nature", "highway", "driving route", "La autopista es rápida."),
  n("tráfico", "el", "masculine", "home_city_travel_nature", "traffic", "busy road", "El tráfico es lento."),
  n("ruido", "el", "masculine", "home_city_travel_nature", "noise", "loud sound", "El ruido viene de la calle."),

  n("bebida", "la", "feminine", "food_drink_shopping", "drink", "drink on table", "La bebida está fría."),
  n("copa", "la", "feminine", "food_drink_shopping", "stem glass", "glass for wine", "La copa está en la mesa."),
  n("jarra", "la", "feminine", "food_drink_shopping", "jug or pitcher", "jug of water", "La jarra tiene agua."),
  n("servilleta", "la", "feminine", "food_drink_shopping", "napkin", "napkin beside plate", "La servilleta está junto al plato."),
  n("mantel", "el", "masculine", "food_drink_shopping", "tablecloth", "table setting", "El mantel es blanco."),
  n("receta", "la", "feminine", "food_drink_shopping", "recipe", "cooking recipe", "La receta usa arroz."),
  n("ingrediente", "el", "masculine", "food_drink_shopping", "ingredient", "cooking ingredient", "El ingrediente está en la cocina."),
  n("vinagre", "el", "masculine", "food_drink_shopping", "vinegar", "salad ingredient", "El vinagre está en la ensalada."),
  n("pimienta", "la", "feminine", "food_drink_shopping", "pepper spice", "spice on table", "La pimienta está junto a la sal."),
  n("ajo", "el", "masculine", "food_drink_shopping", "garlic", "garlic in kitchen", "El ajo está en la cocina."),
  n("perejil", "el", "masculine", "food_drink_shopping", "parsley", "herb in food", "El perejil está fresco."),
  n("tostada", "la", "feminine", "food_drink_shopping", "toast", "breakfast toast", "La tostada tiene mantequilla."),
  n("mermelada", "la", "feminine", "food_drink_shopping", "jam", "jam at breakfast", "La mermelada está dulce."),
  n("miel", "la", "feminine", "food_drink_shopping", "honey", "honey in tea", "La miel está en el té."),
  n("nuez", "la", "feminine", "food_drink_shopping", "walnut", "nut on plate", "La nuez está en el plato."),
  n("almendra", "la", "feminine", "food_drink_shopping", "almond", "almond in bag", "La almendra está en la bolsa."),
  n("piña", "la", "feminine", "food_drink_shopping", "pineapple", "fruit on table", "La piña está madura."),
  n("mango", "el", "masculine", "food_drink_shopping", "mango", "fruit in market", "El mango está dulce."),
  n("kiwi", "el", "masculine", "food_drink_shopping", "kiwi", "fruit at breakfast", "El kiwi está verde."),
  n("melocotón", "el", "masculine", "food_drink_shopping", "peach", "fruit in bowl", "El melocotón está maduro.", "El durazno está maduro.", "durazno", "el"),
  n("cereza", "la", "feminine", "food_drink_shopping", "cherry", "fruit on plate", "La cereza es roja."),
  n("frambuesa", "la", "feminine", "food_drink_shopping", "raspberry", "fruit in bowl", "La frambuesa está en el yogur."),
  n("brócoli", "el", "masculine", "food_drink_shopping", "broccoli", "vegetable on plate", "El brócoli está caliente."),
  n("calabacín", "el", "masculine", "food_drink_shopping", "zucchini", "vegetable in kitchen", "El calabacín está en la cocina."),
  n("berenjena", "la", "feminine", "food_drink_shopping", "eggplant", "vegetable in market", "La berenjena está en el mercado."),
  n("champiñón", "el", "masculine", "food_drink_shopping", "mushroom", "food ingredient", "El champiñón está en la pizza."),
  n("espinaca", "la", "feminine", "food_drink_shopping", "spinach", "green vegetable", "La espinaca está fresca."),
  n("guisante", "el", "masculine", "food_drink_shopping", "pea", "vegetable on plate", "El guisante es pequeño."),
  n("col", "la", "feminine", "food_drink_shopping", "cabbage", "vegetable in market", "La col está en la bolsa."),
  n("bocadillo", "el", "masculine", "food_drink_shopping", "sandwich", "simple meal", "El bocadillo tiene queso."),
  n("tortilla", "la", "feminine", "food_drink_shopping", "omelet or tortilla", "food on plate", "La tortilla está caliente."),
  n("paella", "la", "feminine", "food_drink_shopping", "paella", "rice dish", "La paella tiene marisco."),
  n("hamburguesa", "la", "feminine", "food_drink_shopping", "hamburger", "fast food", "La hamburguesa está en el plato."),
  n("pizza", "la", "feminine", "food_drink_shopping", "pizza", "food at dinner", "La pizza tiene queso."),
  n("tapa", "la", "feminine", "food_drink_shopping", "small tapa dish", "small dish", "La tapa cuesta poco."),
  n("ración", "la", "feminine", "food_drink_shopping", "portion", "food portion", "La ración es grande."),
  n("pedido", "el", "masculine", "food_drink_shopping", "order", "restaurant order", "El pedido está listo."),
  n("propina", "la", "feminine", "food_drink_shopping", "tip", "leaving a tip", "Dejo propina al camarero."),
  n("merienda", "la", "feminine", "food_drink_shopping", "afternoon snack", "snack time", "La merienda es a las cinco."),
  n("salsa", "la", "feminine", "food_drink_shopping", "sauce", "sauce with food", "La salsa está picante."),
  n("mayonesa", "la", "feminine", "food_drink_shopping", "mayonnaise", "sauce for sandwich", "La mayonesa está en el bocadillo."),
  n("mostaza", "la", "feminine", "food_drink_shopping", "mustard", "sauce for sandwich", "La mostaza está en la mesa."),
  n("hambre", "el", "feminine", "food_drink_shopping", "hunger", "feeling hungry", "Tengo hambre ahora."),
  n("sed", "la", "feminine", "food_drink_shopping", "thirst", "feeling thirsty", "Tengo sed después de correr."),
  n("apetito", "el", "masculine", "food_drink_shopping", "appetite", "wanting food", "Tengo poco apetito hoy."),

  v("amar", "-ar", "core_verbs_part003", "to love", "loving family", "Amo a mi familia."),
  v("odiar", "-ar", "core_verbs_part003", "to hate", "disliking noise", "Odio el ruido fuerte."),
  v("creer", "-er", "core_verbs_part003", "to believe or think", "believing an answer", "Creo que la tienda abre hoy."),
  v("saber", "irregular", "core_verbs_part003", "to know facts or how", "knowing an answer", "Sé la respuesta."),
  v("pensar", "irregular", "core_verbs_part003", "to think", "thinking about a plan", "Pienso en el viaje."),
  v("sentir", "irregular", "core_verbs_part003", "to feel", "feeling cold", "Siento frío en la noche."),
  v("parecer", "irregular", "core_verbs_part003", "to seem", "simple opinion", "El hotel parece cómodo."),
  v("dejar", "-ar", "core_verbs_part003", "to leave or let", "leaving an object", "Dejo la llave en la mesa."),
  v("crear", "-ar", "core_verbs_part003", "to create", "creating a list", "Creo una lista nueva."),
  v("tocar", "-ar", "core_verbs_part003", "to touch or play", "playing music", "Toco la guitarra."),
  v("cantar", "-ar", "core_verbs_part003", "to sing", "singing a song", "Canto una canción."),
  v("bailar", "-ar", "core_verbs_part003", "to dance", "dancing at party", "Bailo con mis amigos."),
  v("dibujar", "-ar", "core_verbs_part003", "to draw", "drawing a flower", "Dibujo una flor."),
  v("pintar", "-ar", "core_verbs_part003", "to paint", "painting a wall", "Pinto la pared de blanco."),
  v("practicar", "-ar", "core_verbs_part003", "to practice", "practicing Spanish", "Practico español cada día."),
  v("enseñar", "-ar", "core_verbs_part003", "to teach", "teaching a word", "Enseño una palabra nueva."),
  v("mostrar", "irregular", "core_verbs_part003", "to show", "showing a map", "Muestro el mapa al turista."),
  v("explicar", "-ar", "core_verbs_part003", "to explain", "explaining a route", "Explico la dirección."),
  v("andar", "-ar", "core_verbs_part003", "to walk", "walking in city", "Ando por la avenida."),
  v("pasear", "-ar", "core_verbs_part003", "to take a walk", "walking for leisure", "Paseo por la playa."),
  v("montar", "-ar", "core_verbs_part003", "to ride or assemble", "riding a bike", "Monto en bicicleta."),
  v("alquilar", "-ar", "core_verbs_part003", "to rent", "renting a room", "Alquilo una habitación."),
  v("reservar", "-ar", "core_verbs_part003", "to reserve", "booking a table", "Reservo una mesa para dos."),
  v("invitar", "-ar", "core_verbs_part003", "to invite", "inviting a friend", "Invito a mi amiga a cenar."),
  v("aceptar", "-ar", "core_verbs_part003", "to accept", "accepting an invitation", "Acepto la invitación."),
  v("cancelar", "-ar", "core_verbs_part003", "to cancel", "canceling a booking", "Cancelo la reserva."),
  v("confirmar", "-ar", "core_verbs_part003", "to confirm", "confirming an appointment", "Confirmo la cita por teléfono."),
  v("firmar", "-ar", "core_verbs_part003", "to sign", "signing a form", "Firmo el formulario."),
  v("llenar", "-ar", "core_verbs_part003", "to fill", "filling a glass", "Lleno el vaso de agua."),
  v("guardar", "-ar", "core_verbs_part003", "to keep or save", "keeping money", "Guardo el dinero en la cartera."),
  v("perder", "irregular", "core_verbs_part003", "to lose", "losing keys", "Pierdo las llaves."),
  v("ganar", "-ar", "core_verbs_part003", "to win or earn", "winning a game", "Gano el juego."),
  v("gastar", "-ar", "core_verbs_part003", "to spend", "spending money", "Gasto poco dinero."),
  v("ahorrar", "-ar", "core_verbs_part003", "to save money", "saving money", "Ahorro dinero para viajar."),
  v("construir", "irregular", "core_verbs_part003", "to build", "building a house", "Construyo una casa pequeña."),
  v("romper", "-er", "core_verbs_part003", "to break", "breaking a glass", "Rompo un vaso sin querer."),
  v("arreglar", "-ar", "core_verbs_part003", "to fix", "fixing a bike", "Arreglo la bicicleta."),
  v("cortar", "-ar", "core_verbs_part003", "to cut", "cutting bread", "Corto el pan."),
  v("preparar", "-ar", "core_verbs_part003", "to prepare", "preparing dinner", "Preparo la cena."),
  v("servir", "irregular", "core_verbs_part003", "to serve", "serving food", "Sirvo la sopa."),
  v("mezclar", "-ar", "core_verbs_part003", "to mix", "mixing ingredients", "Mezclo los ingredientes."),
  v("añadir", "-ir", "core_verbs_part003", "to add", "adding salt", "Añado sal a la sopa."),
  v("freír", "-ir", "core_verbs_part003", "to fry", "frying an egg", "Frío un huevo."),
  v("hervir", "-ir", "core_verbs_part003", "to boil", "boiling water", "Hiervo agua para el té."),
  v("calentar", "-ar", "core_verbs_part003", "to heat", "heating food", "Caliento la comida."),
  v("enfriar", "-ar", "core_verbs_part003", "to cool", "cooling a drink", "Enfrío la bebida."),
  v("desayunar", "-ar", "core_verbs_part003", "to have breakfast", "breakfast action", "Desayuno a las ocho."),
  v("almorzar", "irregular", "core_verbs_part003", "to have lunch", "lunch action", "Almuerzo con mi familia."),
  v("cenar", "-ar", "core_verbs_part003", "to have dinner", "dinner action", "Ceno en casa."),
  v("merendar", "irregular", "core_verbs_part003", "to have an afternoon snack", "snack action", "Meriendo fruta por la tarde."),

  adj("mejor", "adjectives_part003", "better", "better option", "Este libro es mejor."),
  adj("peor", "adjectives_part003", "worse", "worse option", "El tiempo es peor hoy."),
  adj("mayor", "adjectives_part003", "older or greater", "older person", "Mi hermano mayor trabaja."),
  adj("menor", "adjectives_part003", "younger or smaller", "younger person", "Mi hermana menor estudia."),
  adj("simple", "adjectives_part003", "simple", "simple question", "La pregunta es simple."),
  adj("común", "adjectives_part003", "common", "common word", "Es una palabra común."),
  adj("especial", "adjectives_part003", "special", "special day", "Hoy es un día especial."),
  adj("privado", "adjectives_part003", "private", "private room", "La habitación es privada."),
  adj("público", "adjectives_part003", "public", "public service", "El baño es público."),
  adj("personal", "adjectives_part003", "personal", "personal information", "La información es personal."),
  adj("nacional", "adjectives_part003", "national", "national holiday", "La fiesta es nacional."),
  adj("internacional", "adjectives_part003", "international", "international airport", "El aeropuerto es internacional."),
  adj("local", "adjectives_part003", "local", "local shop", "La tienda es local."),
  adj("extranjero", "adjectives_part003", "foreign", "foreign student", "El estudiante es extranjero."),
  adj("separado", "adjectives_part003", "separate", "separate rooms", "Las habitaciones están separadas."),
  adj("completo", "adjectives_part003", "complete or full", "complete form", "El formulario está completo."),
  adj("correcto", "adjectives_part003", "correct", "correct answer", "La respuesta es correcta."),
  adj("incorrecto", "adjectives_part003", "incorrect", "wrong answer", "La dirección es incorrecta."),
  adj("verdadero", "adjectives_part003", "true", "true sentence", "La frase es verdadera."),
  adj("falso", "adjectives_part003", "false", "false sentence", "La frase es falsa."),
  adj("dulce", "adjectives_part003", "sweet", "sweet fruit", "La fruta está dulce."),
  adj("salado", "adjectives_part003", "salty", "salty food", "El pescado está salado."),
  adj("picante", "adjectives_part003", "spicy", "spicy sauce", "La salsa está picante."),
  adj("rico", "adjectives_part003", "tasty or rich", "tasty food", "El postre está rico."),
  adj("pobre", "adjectives_part003", "poor", "poor area", "El pueblo es pobre."),
  adj("fuerte", "adjectives_part003", "strong or loud", "strong person", "Mi padre es fuerte."),
  adj("débil", "adjectives_part003", "weak", "weak person", "Estoy débil hoy."),
  adj("sano", "adjectives_part003", "healthy", "healthy food", "La comida es sana."),
  adj("grave", "adjectives_part003", "serious", "serious problem", "El problema es grave."),
  adj("ligero", "adjectives_part003", "lightweight", "light bag", "La bolsa es ligera."),
  adj("pesado", "adjectives_part003", "heavy", "heavy luggage", "El equipaje es pesado."),
  adj("cómodo", "adjectives_part003", "comfortable", "comfortable chair", "La silla es cómoda."),
  adj("incómodo", "adjectives_part003", "uncomfortable", "uncomfortable bed", "La cama es incómoda."),
  adj("moderno", "adjectives_part003", "modern", "modern building", "El edificio es moderno."),
  adj("antiguo", "adjectives_part003", "old or ancient", "old city", "La ciudad es antigua."),
  adj("oscuro", "adjectives_part003", "dark", "dark room", "La habitación está oscura."),
  adj("vacío", "adjectives_part003", "empty", "empty glass", "El vaso está vacío."),
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

async function existingSpanishKeys() {
  const paths = [
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_001_300_v1_candidate_pool.jsonl"),
    path.join(ROOT, "outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_002_300_v1_candidate_pool.jsonl"),
  ];
  const keys = new Set();
  for (const filePath of paths) {
    const rows = await readJsonl(filePath);
    for (const candidate of rows) {
      keys.add(`${normalizeText(candidate.source_lemma).toLocaleLowerCase("es")}::${normalizeText(candidate.part_of_speech)}`);
    }
  }
  return keys;
}

function validateEntries(existingKeys) {
  if (entries.length !== 300) {
    throw new Error(`Part 003 candidate list has ${entries.length} entries, expected 300.`);
  }
  const seenKeys = new Map();
  for (const [index, candidate] of entries.entries()) {
    for (const header of TSV_HEADERS) {
      if (!normalizeText(candidate[header])) {
        throw new Error(`entries[${index}] ${candidate.source_lemma} missing ${header}.`);
      }
      assertNoTsvBreaks(candidate[header], `entries[${index}] ${candidate.source_lemma}.${header}`);
    }
    const key = `${normalizeText(candidate.source_lemma).toLocaleLowerCase("es")}::${normalizeText(candidate.part_of_speech)}`;
    if (seenKeys.has(key)) {
      throw new Error(`Duplicate Part 003 source lemma/POS: ${key} at rows ${seenKeys.get(key)} and ${index + 1}.`);
    }
    if (existingKeys.has(key)) {
      throw new Error(`Part 003 source lemma/POS duplicates Parts 001/002: ${key}.`);
    }
    seenKeys.set(key, index + 1);
  }
}

function toTsv() {
  return [
    TSV_HEADERS.join("\t"),
    ...entries.map((candidate) => TSV_HEADERS.map((header) => normalizeText(candidate[header])).join("\t")),
    "",
  ].join("\n");
}

function resetContract(part002) {
  const contract = {
    contract_id: "spanish_a1_core_release_contract_v1::spanish_a1_core_part_003_300_v1",
    status: "source_candidate_scaffold_ready",
    scope:
      "Spanish A1 course-prep vocabulary release workbook Part 003, separate from ordinary thematic decks, Oxford English vocabulary, HSK Classic and HSK 3.0; final buyer-facing delivery requires separate Spanish (Spain) and Latin American Spanish edition workbooks.",
    approved_for_generation: false,
    source_candidate_file: "config/spanish-a1-core-part-003-candidates.tsv",
    release_part: {
      part_number: 3,
      row_id_start: 601,
      meaning_namespace: "spanish_a1::part_003",
      selected_scope:
        "Internal LunaCards continuation of Spanish A1 Core after Parts 001-002; remaining A1 grammar/function words, everyday identity/service words, body/health/hygiene, home/city/travel/nature, food/shopping, common verbs and adjectives.",
    },
    default_release: {
      release_id: RELEASE_ID,
      course_id: "spanish_a1_core",
      cefr_level: "A1",
      expected_row_count: 300,
    },
    course: part002.course,
    source_policy: part002.source_policy,
    row_identity: part002.row_identity,
    field_rules: part002.field_rules,
    workbook: {
      ...part002.workbook,
      main_sheet_name: "Spanish A1 Core Part 003",
      postgres_import: false,
      ordinary_deck_sort: null,
      isolated_db_storage: {
        ...part002.workbook.isolated_db_storage,
        source_only_saved: false,
        final_support_storage_ready: false,
      },
      google_sheet_created: false,
      final_delivery_ready: false,
    },
    qa_gates: part002.qa_gates,
    ai_tool_policy: {
      ...part002.ai_tool_policy,
      latest_explicit_user_confirmation: null,
      part003_note:
        "No Part 003 live Gemini/support-language generation approval is inherited from Part 002. Subscription-backed Gemini CLI use must be explicitly confirmed before live generation.",
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
  return contract;
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
  validateEntries(existingKeys);
  await fs.writeFile(CANDIDATE_PATH, toTsv(), "utf8");

  const part002 = await readJson(path.join(ROOT, "config/spanish-a1-core-part-002-release-contract-v1.json"));
  await writeJson(CONTRACT_PATH, resetContract(part002));

  const latamMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-002-course-metadata.json"));
  const spainMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-002-course-metadata-spain.json"));
  await writeJson(LATAM_METADATA_PATH, resetMetadata(latamMetadata, { edition: "Latin American Spanish" }));
  await writeJson(SPAIN_METADATA_PATH, resetMetadata(spainMetadata, { edition: "Spanish (Spain)" }));

  console.log(
    JSON.stringify(
      {
        release_id: RELEASE_ID,
        candidates: entries.length,
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
