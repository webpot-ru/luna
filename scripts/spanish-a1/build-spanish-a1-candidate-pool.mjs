#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

import { transcribeSpanishText } from "./lib/spanish-pronunciation.mjs";

const ROOT = process.cwd();

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const contractPath = path.resolve(args.get("contract") ?? "config/spanish-a1-core-release-contract-v1.json");
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/spanish-a1-core/candidate-pools");

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}

function base(pos, lemma, domain, gloss, scene, exampleES, exampleES419 = exampleES, displayES419 = lemma) {
  return {
    source_lemma: lemma,
    display_ES: lemma,
    display_ES_419: displayES419,
    part_of_speech: pos,
    gender: "not_applicable",
    article_ES: "not_applicable",
    article_ES_419: "not_applicable",
    number_policy: "not_applicable",
    verb_infinitive: "not_applicable",
    verb_group: "not_applicable",
    meaning_note: gloss,
    semantic_scene: scene,
    topic_domain: domain,
    example_ES: exampleES,
    example_ES_419: exampleES419,
  };
}

function n(lemma, article, gender, domain, gloss, scene, exampleES, exampleES419 = exampleES, displayES419 = lemma, articleES419 = article) {
  return {
    ...base("noun", lemma, domain, gloss, scene, exampleES, exampleES419, displayES419),
    gender,
    article_ES: article,
    article_ES_419: articleES419,
    number_policy: article === "los" || article === "las" ? "plural_default" : "singular_default",
  };
}

function v(lemma, group, domain, gloss, scene, exampleES, exampleES419 = exampleES) {
  return {
    ...base("verb", lemma, domain, gloss, scene, exampleES, exampleES419),
    verb_infinitive: lemma,
    verb_group: group,
  };
}

function adj(lemma, domain, gloss, scene, exampleES, exampleES419 = exampleES) {
  return base("adjective", lemma, domain, gloss, scene, exampleES, exampleES419);
}

function x(pos, lemma, domain, gloss, scene, exampleES, exampleES419 = exampleES, displayES419 = lemma) {
  return base(pos, lemma, domain, gloss, scene, exampleES, exampleES419, displayES419);
}

const entries = [
  // Social and functional A1 words and phrases.
  x("interjection", "hola", "social_basics", "greeting hello", "greeting someone", "Hola, Ana.", "Hola, Ana."),
  x("interjection", "adiós", "social_basics", "goodbye", "leaving a place", "Adiós, nos vemos mañana.", "Adiós, nos vemos mañana."),
  x("phrase", "buenos días", "social_basics", "good morning", "morning greeting", "Buenos días, señor Ruiz.", "Buenos días, señor Ruiz."),
  x("phrase", "buenas tardes", "social_basics", "good afternoon", "afternoon greeting", "Buenas tardes, profesora.", "Buenas tardes, profesora."),
  x("phrase", "buenas noches", "social_basics", "good night", "night greeting", "Buenas noches, mamá.", "Buenas noches, mamá."),
  x("phrase", "por favor", "social_basics", "please", "polite request", "Un café, por favor.", "Un café, por favor."),
  x("interjection", "gracias", "social_basics", "thank you", "thanking someone", "Gracias por la ayuda.", "Gracias por la ayuda."),
  x("phrase", "de nada", "social_basics", "you are welcome", "replying to thanks", "De nada, Juan.", "De nada, Juan."),
  x("interjection", "perdón", "social_basics", "excuse me or sorry", "small apology", "Perdón, la puerta está cerrada.", "Perdón, la puerta está cerrada."),
  x("phrase", "lo siento", "social_basics", "I am sorry", "apologizing", "Lo siento, llego tarde.", "Lo siento, llego tarde."),
  x("particle", "sí", "social_basics", "yes", "answering yes", "Sí, estoy en casa.", "Sí, estoy en casa."),
  x("particle", "no", "social_basics", "no", "answering no", "No, la tienda está cerrada.", "No, la tienda está cerrada."),
  x("adverb", "claro", "social_basics", "of course", "agreeing politely", "Claro, puedo ayudar.", "Claro, puedo ayudar."),
  x("particle", "vale", "social_basics", "okay", "accepting a plan", "Vale, nos vemos a las ocho.", "Vale, nos vemos a las ocho."),
  x("phrase", "tal vez", "social_basics", "maybe", "uncertain answer", "Tal vez voy al mercado.", "Tal vez voy al mercado."),
  x("adverb", "también", "social_basics", "also", "adding the same idea", "Yo también estudio español.", "Yo también estudio español."),
  x("adverb", "aquí", "location_basics", "here", "pointing to nearby place", "El libro está aquí.", "El libro está aquí."),
  x("adverb", "allí", "location_basics", "there", "pointing to a place", "La parada está allí.", "La parada está allí."),
  x("adverb", "ahora", "time_basics", "now", "current moment", "Ahora estoy en clase.", "Ahora estoy en clase."),
  x("adverb", "hoy", "time_basics", "today", "same day", "Hoy trabajo en la oficina.", "Hoy trabajo en la oficina."),
  x("adverb", "mañana", "time_basics", "tomorrow", "next day", "Mañana viajo a Madrid.", "Mañana viajo a Madrid."),
  x("adverb", "ayer", "time_basics", "yesterday", "previous day", "Ayer estudié en casa.", "Ayer estudié en casa."),
  x("adverb", "siempre", "time_basics", "always", "regular habit", "Siempre desayuno a las ocho.", "Siempre desayuno a las ocho."),
  x("adverb", "nunca", "time_basics", "never", "negative habit", "Nunca tomo café por la noche.", "Nunca tomo café por la noche."),
  x("adverb", "muy", "degree_basics", "very", "simple intensifier", "La sopa está muy caliente.", "La sopa está muy caliente."),

  // People, family and pronouns.
  n("persona", "la", "feminine", "people_family", "person", "a person at the door", "Una persona espera en la puerta."),
  n("hombre", "el", "masculine", "people_family", "man", "a man in the street", "El hombre camina por la calle."),
  n("mujer", "la", "feminine", "people_family", "woman", "a woman in the cafe", "La mujer toma té en la cafetería."),
  n("niño", "el", "masculine", "people_family", "boy", "a boy with a book", "El niño lee un libro."),
  n("niña", "la", "feminine", "people_family", "girl", "a girl with a bag", "La niña lleva una mochila."),
  n("amigo", "el", "masculine", "people_family", "male friend", "meeting a friend", "Mi amigo vive cerca."),
  n("amiga", "la", "feminine", "people_family", "female friend", "calling a friend", "Mi amiga llama por teléfono."),
  n("familia", "la", "feminine", "people_family", "family", "family at home", "Mi familia está en casa."),
  n("madre", "la", "feminine", "people_family", "mother", "mother cooking", "Mi madre cocina arroz."),
  n("padre", "el", "masculine", "people_family", "father", "father working", "Mi padre trabaja hoy."),
  n("hijo", "el", "masculine", "people_family", "son", "son studying", "Su hijo estudia español."),
  n("hija", "la", "feminine", "people_family", "daughter", "daughter writing", "Su hija escribe en el cuaderno."),
  n("hermano", "el", "masculine", "people_family", "brother", "brother at school", "Mi hermano va a la escuela."),
  n("hermana", "la", "feminine", "people_family", "sister", "sister at work", "Mi hermana trabaja en un banco."),
  n("abuelo", "el", "masculine", "people_family", "grandfather", "grandfather in the park", "El abuelo camina en el parque."),
  n("abuela", "la", "feminine", "people_family", "grandmother", "grandmother drinking tea", "La abuela toma té."),
  n("pareja", "la", "feminine", "people_family", "partner or couple", "a couple at dinner", "La pareja cena en casa."),
  n("compañero", "el", "masculine", "people_work", "male classmate or coworker", "coworker at the office", "Mi compañero está en la oficina."),
  n("compañera", "la", "feminine", "people_work", "female classmate or coworker", "classmate in class", "Mi compañera estudia conmigo."),
  n("profesor", "el", "masculine", "people_school", "male teacher", "teacher in class", "El profesor habla despacio."),
  n("profesora", "la", "feminine", "people_school", "female teacher", "teacher at the board", "La profesora escribe en la pizarra."),
  n("estudiante", "not_applicable", "common", "people_school", "student", "student in a class", "El estudiante lee una frase."),
  n("doctor", "el", "masculine", "people_health", "male doctor", "doctor at the hospital", "El doctor trabaja en el hospital."),
  n("doctora", "la", "feminine", "people_health", "female doctor", "doctor helping a patient", "La doctora ayuda a una niña."),
  n("señor", "el", "masculine", "people_social", "Mr. or gentleman", "formal address", "El señor paga la cuenta."),
  n("señora", "la", "feminine", "people_social", "Mrs. or lady", "formal address", "La señora compra pan."),
  x("pronoun", "yo", "pronouns", "I", "speaking about oneself", "Yo vivo en Valencia."),
  x("pronoun", "tú", "pronouns", "you informal singular", "speaking to a friend", "Tú tienes una mochila."),
  x("pronoun", "él", "pronouns", "he", "talking about a man", "Él trabaja en una tienda."),
  x("pronoun", "ella", "pronouns", "she", "talking about a woman", "Ella estudia francés."),
  x("pronoun", "usted", "pronouns", "you formal singular", "polite question", "Usted habla español."),
  x("pronoun", "nosotros", "pronouns", "we masculine or mixed", "group action", "Nosotros vamos al restaurante."),
  x("pronoun", "nosotras", "pronouns", "we feminine", "female group action", "Nosotras comemos ensalada."),
  x("pronoun", "ellos", "pronouns", "they masculine or mixed", "group statement", "Ellos esperan el autobús."),
  x("pronoun", "ellas", "pronouns", "they feminine", "female group statement", "Ellas viven cerca."),
  x("determiner", "mi", "possessives", "my", "possessive before a noun", "Mi casa es pequeña."),
  x("determiner", "tu", "possessives", "your informal", "possessive before a noun", "Tu libro está en la mesa."),
  x("determiner", "su", "possessives", "his her or your formal", "possessive before a noun", "Su coche está en la calle.", "Su auto está en la calle."),
  x("determiner", "nuestro", "possessives", "our", "possessive before a noun", "Nuestro hotel está cerca."),
  x("pronoun", "quién", "question_words", "who", "asking about a person", "¿Quién llama a la puerta?"),

  // Numbers, dates and time.
  x("numeral", "cero", "numbers_time", "zero", "counting messages", "Tengo cero mensajes."),
  x("numeral", "uno", "numbers_time", "one", "counting an item", "Tengo un libro."),
  x("numeral", "dos", "numbers_time", "two", "counting items", "Tengo dos llaves."),
  x("numeral", "tres", "numbers_time", "three", "counting items", "Hay tres sillas en la cocina."),
  x("numeral", "cuatro", "numbers_time", "four", "counting people", "Cuatro personas esperan el tren."),
  x("numeral", "cinco", "numbers_time", "five", "counting minutes", "La clase empieza en cinco minutos."),
  x("numeral", "seis", "numbers_time", "six", "telling time", "Son las seis."),
  x("numeral", "siete", "numbers_time", "seven", "telling time", "Desayuno a las siete."),
  x("numeral", "ocho", "numbers_time", "eight", "telling time", "Trabajo a las ocho."),
  x("numeral", "nueve", "numbers_time", "nine", "telling time", "La tienda abre a las nueve."),
  x("numeral", "diez", "numbers_time", "ten", "counting euros", "El menú cuesta diez euros."),
  x("numeral", "once", "numbers_time", "eleven", "telling time", "El tren llega a las once."),
  x("numeral", "doce", "numbers_time", "twelve", "telling time", "La comida es a las doce."),
  x("numeral", "trece", "numbers_time", "thirteen", "counting pages", "El libro tiene trece páginas."),
  x("numeral", "catorce", "numbers_time", "fourteen", "counting days", "Viajo en catorce días."),
  x("numeral", "quince", "numbers_time", "fifteen", "counting minutes", "Espero quince minutos."),
  x("numeral", "veinte", "numbers_time", "twenty", "counting euros", "La chaqueta cuesta veinte euros."),
  x("numeral", "treinta", "numbers_time", "thirty", "counting minutes", "La clase dura treinta minutos."),
  x("ordinal", "primero", "numbers_time", "first", "order in a line", "Soy el primero en la fila."),
  x("ordinal", "segundo", "numbers_time", "second", "order in a line", "El segundo tren llega pronto."),
  n("minuto", "el", "masculine", "numbers_time", "minute", "waiting briefly", "El minuto pasa rápido."),
  n("hora", "la", "feminine", "numbers_time", "hour", "asking time", "La hora está en el reloj."),
  n("día", "el", "masculine", "numbers_time", "day", "one day", "El día empieza temprano."),
  n("semana", "la", "feminine", "numbers_time", "week", "weekly plan", "La semana termina el domingo."),
  n("mes", "el", "masculine", "numbers_time", "month", "month on a calendar", "El mes tiene cuatro semanas."),
  n("año", "el", "masculine", "numbers_time", "year", "one year", "El año empieza en enero."),
  n("tarde", "la", "feminine", "numbers_time", "afternoon", "afternoon plan", "La tarde es tranquila."),
  n("noche", "la", "feminine", "numbers_time", "night", "night at home", "La noche es fría."),
  n("lunes", "el", "masculine", "numbers_time", "Monday", "weekly schedule", "El lunes trabajo."),
  n("martes", "el", "masculine", "numbers_time", "Tuesday", "weekly schedule", "El martes estudio."),
  n("miércoles", "el", "masculine", "numbers_time", "Wednesday", "weekly schedule", "El miércoles voy al mercado."),
  n("jueves", "el", "masculine", "numbers_time", "Thursday", "weekly schedule", "El jueves tengo clase."),
  n("viernes", "el", "masculine", "numbers_time", "Friday", "weekly schedule", "El viernes ceno con mi familia."),
  n("sábado", "el", "masculine", "numbers_time", "Saturday", "weekend plan", "El sábado viajo a Sevilla."),
  n("domingo", "el", "masculine", "numbers_time", "Sunday", "weekend rest", "El domingo descanso en casa."),
  n("enero", "not_applicable", "masculine", "numbers_time", "January", "month name", "Enero es un mes frío."),
  n("febrero", "not_applicable", "masculine", "numbers_time", "February", "month name", "Febrero tiene pocos días."),
  n("marzo", "not_applicable", "masculine", "numbers_time", "March", "month name", "Marzo llega después de febrero."),
  n("abril", "not_applicable", "masculine", "numbers_time", "April", "month name", "Abril empieza mañana."),
  n("mayo", "not_applicable", "masculine", "numbers_time", "May", "month name", "Mayo es un mes bonito."),
  n("verano", "el", "masculine", "numbers_time", "summer", "season", "El verano es caluroso."),
  n("invierno", "el", "masculine", "numbers_time", "winter", "season", "El invierno es frío."),
  n("cumpleaños", "el", "masculine", "numbers_time", "birthday", "birthday celebration", "Mi cumpleaños es en mayo."),
  n("fecha", "la", "feminine", "numbers_time", "date", "date on a form", "La fecha está en el papel."),
  x("phrase", "fin de semana", "numbers_time", "weekend", "weekend plan", "El fin de semana voy al parque."),

  // Home, city, travel and common objects.
  n("casa", "la", "feminine", "home_city_travel", "house or home", "home location", "Mi casa está cerca del parque."),
  n("apartamento", "el", "masculine", "home_city_travel", "apartment", "apartment location", "El apartamento tiene dos habitaciones."),
  n("piso", "el", "masculine", "home_city_travel", "flat or apartment", "apartment in a city", "El piso está en el centro.", "El departamento está en el centro.", "departamento", "el"),
  n("habitación", "la", "feminine", "home_city_travel", "room", "room in a home", "La habitación es pequeña."),
  n("cocina", "la", "feminine", "home_city_travel", "kitchen", "kitchen at home", "La cocina está limpia."),
  n("baño", "el", "masculine", "home_city_travel", "bathroom", "bathroom in a home", "El baño está al fondo."),
  n("puerta", "la", "feminine", "home_city_travel", "door", "closed door", "La puerta está cerrada."),
  n("ventana", "la", "feminine", "home_city_travel", "window", "open window", "La ventana está abierta."),
  n("mesa", "la", "feminine", "home_city_travel", "table", "object on a table", "El libro está en la mesa."),
  n("silla", "la", "feminine", "home_city_travel", "chair", "sitting on a chair", "La silla está junto a la mesa."),
  n("cama", "la", "feminine", "home_city_travel", "bed", "bedroom object", "La cama está en la habitación."),
  n("sofá", "el", "masculine", "home_city_travel", "sofa", "living room object", "El sofá es cómodo."),
  n("libro", "el", "masculine", "home_city_travel", "book", "reading a book", "El libro está abierto."),
  n("cuaderno", "el", "masculine", "home_city_travel", "notebook", "writing in a notebook", "El cuaderno está en la mochila."),
  n("bolígrafo", "el", "masculine", "home_city_travel", "pen", "using a pen", "El bolígrafo escribe bien."),
  n("teléfono", "el", "masculine", "home_city_travel", "telephone", "phone on a table", "El teléfono está en la mesa."),
  n("móvil", "el", "masculine", "home_city_travel", "mobile phone", "phone in a bag", "Mi móvil está en la mochila.", "Mi celular está en la mochila.", "celular", "el"),
  n("ordenador", "el", "masculine", "home_city_travel", "computer", "computer on a desk", "El ordenador está en la oficina."),
  n("llave", "la", "feminine", "home_city_travel", "key", "key in a bag", "La llave está en el bolso."),
  n("bolso", "el", "masculine", "home_city_travel", "handbag or bag", "bag on a chair", "El bolso está en la silla."),
  n("mochila", "la", "feminine", "home_city_travel", "backpack", "backpack at school", "La mochila está en la escuela."),
  n("calle", "la", "feminine", "home_city_travel", "street", "street location", "La calle es larga."),
  n("ciudad", "la", "feminine", "home_city_travel", "city", "city travel", "La ciudad tiene un aeropuerto."),
  n("pueblo", "el", "masculine", "home_city_travel", "town or village", "small town", "El pueblo está cerca del río."),
  n("país", "el", "masculine", "home_city_travel", "country", "country name", "España es un país grande."),
  n("tienda", "la", "feminine", "home_city_travel", "shop", "shopping place", "La tienda abre a las diez."),
  n("supermercado", "el", "masculine", "home_city_travel", "supermarket", "shopping for food", "El supermercado vende fruta."),
  n("restaurante", "el", "masculine", "home_city_travel", "restaurant", "eating out", "El restaurante tiene menú."),
  n("cafetería", "la", "feminine", "home_city_travel", "cafe", "ordering coffee", "La cafetería sirve café."),
  n("hotel", "el", "masculine", "home_city_travel", "hotel", "staying in a hotel", "El hotel está cerca de la estación."),
  n("escuela", "la", "feminine", "home_city_travel", "school", "going to school", "La escuela empieza temprano."),
  n("universidad", "la", "feminine", "home_city_travel", "university", "study place", "La universidad está en la ciudad."),
  n("oficina", "la", "feminine", "home_city_travel", "office", "workplace", "La oficina está abierta."),
  n("banco", "el", "masculine", "home_city_travel", "bank", "paying at bank", "El banco cierra a las dos."),
  n("farmacia", "la", "feminine", "home_city_travel", "pharmacy", "buying medicine", "La farmacia está cerca."),
  n("hospital", "el", "masculine", "home_city_travel", "hospital", "health location", "El hospital está lejos."),
  n("estación", "la", "feminine", "home_city_travel", "station", "train station", "La estación tiene muchos trenes."),
  n("aeropuerto", "el", "masculine", "home_city_travel", "airport", "flight location", "El aeropuerto está fuera de la ciudad."),
  n("parada", "la", "feminine", "home_city_travel", "stop", "bus stop", "La parada está allí."),
  n("autobús", "el", "masculine", "home_city_travel", "bus", "waiting for a bus", "El autobús llega pronto."),
  n("tren", "el", "masculine", "home_city_travel", "train", "taking a train", "El tren sale a las ocho."),
  n("taxi", "el", "masculine", "home_city_travel", "taxi", "taxi in the street", "El taxi está en la calle."),
  n("coche", "el", "masculine", "home_city_travel", "car", "car in the street", "El coche está en la calle.", "El auto está en la calle.", "auto", "el"),
  n("billete", "el", "masculine", "home_city_travel", "ticket", "travel ticket", "El billete está en mi bolso.", "El boleto está en mi bolso.", "boleto", "el"),
  n("mapa", "el", "masculine", "home_city_travel", "map", "using a map", "El mapa está en la mesa."),

  // Food, drinks and shopping.
  n("agua", "el", "feminine", "food_drink_shopping", "water", "drinking water", "El agua está fría."),
  n("pan", "el", "masculine", "food_drink_shopping", "bread", "buying bread", "El pan está en la mesa."),
  n("arroz", "el", "masculine", "food_drink_shopping", "rice", "cooked rice", "El arroz está caliente."),
  n("pasta", "la", "feminine", "food_drink_shopping", "pasta", "food on a plate", "La pasta está en el plato."),
  n("sopa", "la", "feminine", "food_drink_shopping", "soup", "eating soup", "La sopa está caliente."),
  n("ensalada", "la", "feminine", "food_drink_shopping", "salad", "salad at lunch", "La ensalada tiene tomate."),
  n("carne", "la", "feminine", "food_drink_shopping", "meat", "buying meat", "La carne está en el mercado."),
  n("pescado", "el", "masculine", "food_drink_shopping", "fish", "fish for dinner", "El pescado está en el plato."),
  n("pollo", "el", "masculine", "food_drink_shopping", "chicken", "chicken for lunch", "El pollo está con arroz."),
  n("huevo", "el", "masculine", "food_drink_shopping", "egg", "egg for breakfast", "El huevo está en la cocina."),
  n("queso", "el", "masculine", "food_drink_shopping", "cheese", "cheese with bread", "El queso está con el pan."),
  n("leche", "la", "feminine", "food_drink_shopping", "milk", "milk in a glass", "La leche está en el vaso."),
  n("café", "el", "masculine", "food_drink_shopping", "coffee", "coffee in a cup", "El café está en la taza."),
  n("té", "el", "masculine", "food_drink_shopping", "tea", "tea in a cup", "El té está caliente."),
  n("zumo", "el", "masculine", "food_drink_shopping", "juice", "juice at breakfast", "Tomo zumo en el desayuno.", "Tomo jugo en el desayuno.", "jugo", "el"),
  n("fruta", "la", "feminine", "food_drink_shopping", "fruit", "fruit on a table", "La fruta está en la mesa."),
  n("manzana", "la", "feminine", "food_drink_shopping", "apple", "eating an apple", "La manzana es roja."),
  n("plátano", "el", "masculine", "food_drink_shopping", "banana", "banana in a bag", "El plátano está en la bolsa."),
  n("naranja", "la", "feminine", "food_drink_shopping", "orange", "orange fruit", "La naranja está dulce."),
  n("uva", "la", "feminine", "food_drink_shopping", "grape", "grape on a plate", "La uva está en el plato."),
  n("verdura", "la", "feminine", "food_drink_shopping", "vegetable", "vegetable in a market", "La verdura está fresca."),
  n("tomate", "el", "masculine", "food_drink_shopping", "tomato", "tomato in salad", "El tomate está en la ensalada."),
  n("patata", "la", "feminine", "food_drink_shopping", "potato", "hot potato", "La patata está caliente.", "La papa está caliente.", "papa", "la"),
  n("cebolla", "la", "feminine", "food_drink_shopping", "onion", "onion in kitchen", "La cebolla está en la cocina."),
  n("sal", "la", "feminine", "food_drink_shopping", "salt", "salt on a table", "La sal está en la mesa."),
  n("azúcar", "el", "masculine", "food_drink_shopping", "sugar", "sugar for coffee", "El azúcar está junto al café."),
  n("aceite", "el", "masculine", "food_drink_shopping", "oil", "oil in kitchen", "El aceite está en la cocina."),
  n("desayuno", "el", "masculine", "food_drink_shopping", "breakfast", "morning meal", "El desayuno está listo."),
  n("comida", "la", "feminine", "food_drink_shopping", "lunch or food", "midday meal", "La comida empieza a las dos."),
  n("cena", "la", "feminine", "food_drink_shopping", "dinner", "evening meal", "La cena está en la mesa."),
  n("plato", "el", "masculine", "food_drink_shopping", "plate or dish", "food plate", "El plato está limpio."),
  n("vaso", "el", "masculine", "food_drink_shopping", "glass", "glass of water", "El vaso tiene agua."),
  n("taza", "la", "feminine", "food_drink_shopping", "cup", "cup of coffee", "La taza tiene café."),
  n("botella", "la", "feminine", "food_drink_shopping", "bottle", "bottle on table", "La botella está en la mesa."),
  n("cuchara", "la", "feminine", "food_drink_shopping", "spoon", "spoon beside plate", "La cuchara está junto al plato."),
  n("tenedor", "el", "masculine", "food_drink_shopping", "fork", "fork beside plate", "El tenedor está en la mesa."),
  n("cuchillo", "el", "masculine", "food_drink_shopping", "knife", "knife in kitchen", "El cuchillo está en la cocina."),
  n("cuenta", "la", "feminine", "food_drink_shopping", "bill", "restaurant bill", "La cuenta llega después de la cena."),
  n("dinero", "el", "masculine", "food_drink_shopping", "money", "paying with money", "El dinero está en el bolso."),
  n("tarjeta", "la", "feminine", "food_drink_shopping", "card", "paying by card", "Pago con tarjeta."),
  n("precio", "el", "masculine", "food_drink_shopping", "price", "price in shop", "El precio está en la etiqueta."),
  n("mercado", "el", "masculine", "food_drink_shopping", "market", "buying food", "El mercado vende fruta."),
  n("kilo", "el", "masculine", "food_drink_shopping", "kilo", "weight at market", "Compro un kilo de arroz."),
  n("bolsa", "la", "feminine", "food_drink_shopping", "bag", "shopping bag", "La bolsa tiene pan."),
  n("menú", "el", "masculine", "food_drink_shopping", "menu", "restaurant menu", "El menú tiene sopa."),

  // Core A1 verbs.
  v("ser", "irregular", "core_verbs", "to be for identity", "identity statement", "Soy estudiante."),
  v("estar", "irregular", "core_verbs", "to be for state or location", "location statement", "Estoy en casa."),
  v("tener", "irregular", "core_verbs", "to have", "having an object", "Tengo una llave."),
  v("hacer", "irregular", "core_verbs", "to do or make", "doing homework", "Hago una lista."),
  v("ir", "irregular", "core_verbs", "to go", "going to a place", "Voy al supermercado."),
  v("venir", "irregular", "core_verbs", "to come", "coming home", "Vengo a casa a las seis."),
  v("vivir", "-ir", "core_verbs", "to live", "living in a city", "Vivo en Madrid."),
  v("hablar", "-ar", "core_verbs", "to speak", "speaking Spanish", "Hablo español en clase."),
  v("escuchar", "-ar", "core_verbs", "to listen", "listening to teacher", "Escucho a la profesora."),
  v("leer", "-er", "core_verbs", "to read", "reading a book", "Leo un libro pequeño."),
  v("escribir", "-ir", "core_verbs", "to write", "writing in notebook", "Escribo en el cuaderno."),
  v("estudiar", "-ar", "core_verbs", "to study", "studying at home", "Estudio español en casa."),
  v("trabajar", "-ar", "core_verbs", "to work", "working in office", "Trabajo en una oficina."),
  v("comer", "-er", "core_verbs", "to eat", "eating lunch", "Como arroz con pollo."),
  v("beber", "-er", "core_verbs", "to drink", "drinking water", "Bebo agua fría."),
  v("cocinar", "-ar", "core_verbs", "to cook", "cooking soup", "Cocino sopa para la cena."),
  v("comprar", "-ar", "core_verbs", "to buy", "buying bread", "Compro pan en la tienda."),
  v("vender", "-er", "core_verbs", "to sell", "shop selling fruit", "La tienda vende fruta."),
  v("pagar", "-ar", "core_verbs", "to pay", "paying the bill", "Pago la cuenta con tarjeta."),
  v("abrir", "-ir", "core_verbs", "to open", "opening a door", "Abro la puerta."),
  v("cerrar", "-ar", "core_verbs", "to close", "closing a window", "Cierro la ventana."),
  v("entrar", "-ar", "core_verbs", "to enter", "entering a shop", "Entro en la tienda."),
  v("salir", "-ir", "core_verbs", "to leave or go out", "leaving home", "Salgo de casa temprano."),
  v("llegar", "-ar", "core_verbs", "to arrive", "arriving by train", "Llego a la estación."),
  v("esperar", "-ar", "core_verbs", "to wait or hope", "waiting for bus", "Espero el autobús."),
  v("buscar", "-ar", "core_verbs", "to look for", "looking for keys", "Busco mis llaves."),
  v("encontrar", "irregular", "core_verbs", "to find", "finding a book", "Encuentro el libro en la mesa."),
  v("mirar", "-ar", "core_verbs", "to look at", "looking at a map", "Miro el mapa."),
  v("ver", "irregular", "core_verbs", "to see", "seeing a friend", "Veo a mi amigo."),
  v("oír", "irregular", "core_verbs", "to hear", "hearing phone", "Oigo el teléfono."),
  v("llamar", "-ar", "core_verbs", "to call", "calling a friend", "Llamo a mi hermana."),
  v("decir", "irregular", "core_verbs", "to say", "saying hello", "Digo hola al profesor."),
  v("preguntar", "-ar", "core_verbs", "to ask", "asking a question", "Pregunto la hora."),
  v("responder", "-er", "core_verbs", "to answer", "answering a question", "Respondo en español."),
  v("entender", "irregular", "core_verbs", "to understand", "understanding a phrase", "Entiendo la frase."),
  v("aprender", "-er", "core_verbs", "to learn", "learning Spanish", "Aprendo palabras nuevas."),
  v("necesitar", "-ar", "core_verbs", "to need", "needing a ticket", "Necesito un billete.", "Necesito un boleto."),
  v("querer", "irregular", "core_verbs", "to want", "wanting coffee", "Quiero un café."),
  v("poder", "irregular", "core_verbs", "can or to be able", "can help", "Puedo ayudar ahora."),
  v("tomar", "-ar", "core_verbs", "to take or drink", "drinking tea", "Tomo té por la tarde."),
  v("llevar", "-ar", "core_verbs", "to carry or wear", "carrying a backpack", "Llevo una mochila."),
  v("traer", "irregular", "core_verbs", "to bring", "bringing bread", "Traigo pan para la cena."),
  v("poner", "irregular", "core_verbs", "to put", "putting a book", "Pongo el libro en la mesa."),
  v("usar", "-ar", "core_verbs", "to use", "using a phone", "Uso el móvil.", "Uso el celular."),
  v("ayudar", "-ar", "core_verbs", "to help", "helping a friend", "Ayudo a mi amigo."),
  v("limpiar", "-ar", "core_verbs", "to clean", "cleaning kitchen", "Limpio la cocina."),
  v("lavar", "-ar", "core_verbs", "to wash", "washing a glass", "Lavo el vaso."),
  v("dormir", "irregular", "core_verbs", "to sleep", "sleeping at night", "Duermo por la noche."),
  v("levantarse", "-ar", "core_verbs", "to get up", "getting up early", "Me levanto temprano."),
  v("sentarse", "-ar", "core_verbs", "to sit down", "sitting at table", "Me siento en la silla."),
  v("caminar", "-ar", "core_verbs", "to walk", "walking in street", "Camino por la calle."),
  v("correr", "-er", "core_verbs", "to run", "running in park", "Corro en el parque."),
  v("jugar", "irregular", "core_verbs", "to play", "playing with child", "Juego con mi hijo."),
  v("viajar", "-ar", "core_verbs", "to travel", "traveling by train", "Viajo en tren."),
  v("conocer", "irregular", "core_verbs", "to know or meet", "knowing a city", "Conozco la ciudad."),

  // Adjectives, colors and useful adverbs.
  adj("bueno", "adjectives_adverbs_colors", "good", "quality of a book", "El libro es bueno."),
  adj("malo", "adjectives_adverbs_colors", "bad", "quality of a day", "El día es malo."),
  adj("grande", "adjectives_adverbs_colors", "big", "size of a house", "La casa es grande."),
  adj("pequeño", "adjectives_adverbs_colors", "small", "size of a room", "La habitación es pequeña."),
  adj("alto", "adjectives_adverbs_colors", "tall or high", "height of a building", "El hotel es alto."),
  adj("bajo", "adjectives_adverbs_colors", "short or low", "height of a table", "La mesa es baja."),
  adj("nuevo", "adjectives_adverbs_colors", "new", "new object", "El cuaderno es nuevo."),
  adj("viejo", "adjectives_adverbs_colors", "old", "old object", "El mapa es viejo."),
  adj("joven", "adjectives_adverbs_colors", "young", "young person", "La profesora es joven."),
  adj("bonito", "adjectives_adverbs_colors", "pretty or nice", "nice city", "La ciudad es bonita."),
  adj("feo", "adjectives_adverbs_colors", "ugly", "ugly street", "La calle es fea."),
  adj("fácil", "adjectives_adverbs_colors", "easy", "easy question", "La pregunta es fácil."),
  adj("difícil", "adjectives_adverbs_colors", "difficult", "difficult exercise", "El ejercicio es difícil."),
  adj("caliente", "adjectives_adverbs_colors", "hot", "hot soup", "La sopa está caliente."),
  adj("frío", "adjectives_adverbs_colors", "cold", "cold water", "El agua está fría."),
  adj("rápido", "adjectives_adverbs_colors", "fast", "fast train", "El tren es rápido."),
  adj("lento", "adjectives_adverbs_colors", "slow", "slow bus", "El autobús es lento."),
  adj("caro", "adjectives_adverbs_colors", "expensive", "expensive hotel", "El hotel es caro."),
  adj("barato", "adjectives_adverbs_colors", "cheap", "cheap menu", "El menú es barato."),
  adj("abierto", "adjectives_adverbs_colors", "open", "open shop", "La tienda está abierta."),
  adj("cerrado", "adjectives_adverbs_colors", "closed", "closed bank", "El banco está cerrado."),
  adj("limpio", "adjectives_adverbs_colors", "clean", "clean plate", "El plato está limpio."),
  adj("sucio", "adjectives_adverbs_colors", "dirty", "dirty glass", "El vaso está sucio."),
  adj("feliz", "adjectives_adverbs_colors", "happy", "happy person", "La niña está feliz."),
  adj("triste", "adjectives_adverbs_colors", "sad", "sad friend", "Mi amigo está triste."),
  adj("cansado", "adjectives_adverbs_colors", "tired", "tired person", "Estoy cansado."),
  adj("enfermo", "adjectives_adverbs_colors", "sick", "sick child", "El niño está enfermo."),
  adj("listo", "adjectives_adverbs_colors", "ready", "ready breakfast", "El desayuno está listo."),
  adj("ocupado", "adjectives_adverbs_colors", "busy", "busy office", "La oficina está ocupada."),
  adj("libre", "adjectives_adverbs_colors", "free or available", "available table", "La mesa está libre."),
  adj("rojo", "adjectives_adverbs_colors", "red", "red apple", "La manzana es roja."),
  adj("azul", "adjectives_adverbs_colors", "blue", "blue bag", "La mochila es azul."),
  adj("verde", "adjectives_adverbs_colors", "green", "green door", "La puerta es verde."),
  adj("amarillo", "adjectives_adverbs_colors", "yellow", "yellow notebook", "El cuaderno es amarillo."),
  adj("blanco", "adjectives_adverbs_colors", "white", "white plate", "El plato es blanco."),
  adj("negro", "adjectives_adverbs_colors", "black", "black car", "El coche es negro.", "El auto es negro."),
  adj("gris", "adjectives_adverbs_colors", "gray", "gray building", "El edificio es gris."),
  x("adverb", "cerca", "adjectives_adverbs_colors", "near", "near location", "La farmacia está cerca."),
  x("adverb", "lejos", "adjectives_adverbs_colors", "far", "far location", "El hospital está lejos."),
  x("adverb", "temprano", "adjectives_adverbs_colors", "early", "early action", "Llego temprano a clase."),
  x("adverb", "despacio", "adjectives_adverbs_colors", "slowly", "slow speech", "Hablo despacio en español."),
  x("adverb", "bien", "adjectives_adverbs_colors", "well", "doing something well", "Leo bien en español."),
  x("adverb", "mal", "adjectives_adverbs_colors", "badly", "feeling bad", "Hoy me siento mal."),
  x("adverb", "mucho", "adjectives_adverbs_colors", "a lot", "studying much", "Estudio mucho por la noche."),
  x("adverb", "poco", "adjectives_adverbs_colors", "a little", "eating little", "Como poco por la mañana."),
];

function parseTsvLine(line) {
  return line.split("\t").map((cell) => normalizeText(cell));
}

async function readEntriesFromTsv(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() && !line.trimStart().startsWith("#"));
  if (!lines.length) return [];

  const headers = parseTsvLine(lines[0]);
  const required = [
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
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new Error(`${path.relative(ROOT, filePath)} missing required TSV headers: ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line, index) => {
    const cells = parseTsvLine(line);
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
    for (const header of required) {
      if (!row[header]) {
        throw new Error(`${path.relative(ROOT, filePath)}:${index + 2} missing ${header}`);
      }
    }
    return row;
  });
}

function buildRows(contract) {
  const releaseId = contract.default_release.release_id;
  const courseId = contract.default_release.course_id;
  const expectedCount = Number(contract.default_release.expected_row_count);
  const sourceEntries = contract.source_candidate_file_entries ?? entries;
  const rowIdStart = Number(contract.release_part?.row_id_start ?? 1);
  const meaningNamespace = contract.release_part?.meaning_namespace ?? "spanish_a1";
  if (sourceEntries.length !== expectedCount) {
    throw new Error(`Spanish A1 candidate list has ${sourceEntries.length} entries, expected ${expectedCount}.`);
  }

  const rows = [];
  const seenSlugs = new Map();
  for (const [index, entry] of sourceEntries.entries()) {
    const order = index + 1;
    const absoluteOrder = rowIdStart + index;
    const rowId = `spa_a1_${String(absoluteOrder).padStart(4, "0")}`;
    const baseSlug = slugify(`${entry.source_lemma}_${entry.part_of_speech}`);
    const duplicateIndex = (seenSlugs.get(baseSlug) ?? 0) + 1;
    seenSlugs.set(baseSlug, duplicateIndex);
    const slug = duplicateIndex === 1 ? baseSlug : `${baseSlug}_${duplicateIndex}`;
    rows.push({
      release_id: releaseId,
      course_id: courseId,
      row_id: rowId,
      spanish_item_id: `es_a1_${String(absoluteOrder).padStart(4, "0")}_${slug}`,
      meaning_id: `${meaningNamespace}::${slug}::${String(absoluteOrder).padStart(4, "0")}`,
      cefr_level: contract.default_release.cefr_level,
      source_language: contract.course.source_language_code,
      source_variant: contract.course.source_variant,
      source_lemma: entry.source_lemma,
      display_ES: entry.display_ES,
      display_ES_419: entry.display_ES_419,
      part_of_speech: entry.part_of_speech,
      gender: entry.gender,
      article_ES: entry.article_ES,
      article_ES_419: entry.article_ES_419,
      number_policy: entry.number_policy,
      verb_infinitive: entry.verb_infinitive,
      verb_group: entry.verb_group,
      meaning_note: entry.meaning_note,
      semantic_scene: entry.semantic_scene,
      topic_domain: entry.topic_domain,
      example_ES: entry.example_ES,
      example_ES_419: entry.example_ES_419,
      transcription_ES: transcribeSpanishText(entry.display_ES, "ES"),
      transcription_ES_419: transcribeSpanishText(entry.display_ES_419, "ES-419"),
      source_status: "internal_lunacards_candidate_pending_source_review",
      qa_status: "candidate_pool_selected_pending_gate_review",
      qa_notes: "Internal LunaCards A1 candidate. PCIC/DELE/SIELE are benchmark-only; local Spanish sources remain candidate evidence until row-level review.",
      selection_decision: "selected",
      selection_order: order,
    });
  }
  return rows;
}

async function main() {
  const contract = JSON.parse(await fs.readFile(contractPath, "utf8"));
  if (contract.approved_for_generation !== false) {
    throw new Error("Spanish A1 candidate-pool builder refuses contracts approved_for_generation.");
  }
  if (contract.source_candidate_file) {
    contract.source_candidate_file_entries = await readEntriesFromTsv(path.resolve(contract.source_candidate_file));
  }
  const releaseId = contract.default_release.release_id;
  const rows = buildRows(contract);
  await fs.mkdir(outputDir, { recursive: true });
  const poolPath = path.join(outputDir, `${releaseId}_candidate_pool.jsonl`);
  const summaryPath = path.join(outputDir, `${releaseId}_candidate_pool_summary.md`);
  await fs.writeFile(poolPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const domainCounts = rows.reduce((acc, row) => {
    acc[row.topic_domain] = (acc[row.topic_domain] ?? 0) + 1;
    return acc;
  }, {});
  const posCounts = rows.reduce((acc, row) => {
    acc[row.part_of_speech] = (acc[row.part_of_speech] ?? 0) + 1;
    return acc;
  }, {});
  await fs.writeFile(
    summaryPath,
    [
      `# Candidate Pool: ${releaseId}`,
      "",
      `- Rows: ${rows.length}`,
      `- Selected: ${rows.filter((row) => row.selection_decision === "selected").length}`,
      `- Course: ${contract.default_release.course_id}`,
      `- CEFR: ${contract.default_release.cefr_level}`,
      "",
      "This pool is internal LunaCards curation. PCIC/DELE/SIELE are benchmark-only, not row sources.",
      "Local Spanish dictionaries/corpora are candidate evidence and still require row-level source review before generation approval.",
      "",
      "## Topic Counts",
      "",
      ...Object.entries(domainCounts).map(([domain, count]) => `- ${domain}: ${count}`),
      "",
      "## POS Counts",
      "",
      ...Object.entries(posCounts).map(([pos, count]) => `- ${pos}: ${count}`),
      "",
    ].join("\n"),
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        release_id: releaseId,
        rows: rows.length,
        selected: rows.filter((row) => row.selection_decision === "selected").length,
        pool: path.relative(ROOT, poolPath),
        summary: path.relative(ROOT, summaryPath),
      },
      null,
      2
    )
  );
}

await main();
