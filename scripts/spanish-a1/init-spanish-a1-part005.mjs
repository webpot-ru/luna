#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RELEASE_ID = "spanish_a1_core_part_005_300_v1";
const PART_LABEL = "Part 005";
const CONTRACT_PATH = path.join(ROOT, "config/spanish-a1-core-part-005-release-contract-v1.json");
const CANDIDATE_PATH = path.join(ROOT, "config/spanish-a1-core-part-005-candidates.tsv");
const LATAM_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-005-course-metadata.json");
const SPAIN_METADATA_PATH = path.join(ROOT, "config/spanish-a1-core-part-005-course-metadata-spain.json");

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
  adj("brillante", "adjectives_part005", "bright or shiny", "bright light", "La luz es brillante."),
  adj("apagado", "adjectives_part005", "off", "device off", "El teléfono está apagado."),
  adj("encendido", "adjectives_part005", "on", "device on", "La pantalla está encendida."),
  adj("duro", "adjectives_part005", "hard", "hard chair", "La silla es dura."),
  adj("blando", "adjectives_part005", "soft", "soft bread", "El pan está blando."),
  adj("suave", "adjectives_part005", "soft or gentle", "soft fabric", "La bufanda es suave."),
  adj("ruidoso", "adjectives_part005", "noisy", "noisy place", "El barrio es ruidoso."),
  adj("silencioso", "adjectives_part005", "quiet", "quiet room", "La habitación es silenciosa."),
  adj("delicioso", "adjectives_part005", "delicious", "tasty food", "La tarta está deliciosa."),
  n("vaca", "la", "feminine", "animals_food_nature", "cow", "farm animal", "La vaca está en el campo."),
  n("oveja", "la", "feminine", "animals_food_nature", "sheep", "farm animal", "La oveja come hierba."),
  n("gallina", "la", "feminine", "animals_food_nature", "hen", "farm bird", "La gallina está en el patio."),
  n("conejo", "el", "masculine", "animals_food_nature", "rabbit", "small animal", "El conejo corre en el jardín."),
  n("abeja", "la", "feminine", "animals_food_nature", "bee", "small insect", "La abeja está en la flor."),
  n("mosca", "la", "feminine", "animals_food_nature", "fly", "small insect", "La mosca está en la ventana."),
  n("hormiga", "la", "feminine", "animals_food_nature", "ant", "small insect", "La hormiga lleva comida."),
  n("ciruela", "la", "feminine", "animals_food_nature", "plum", "fruit food", "La ciruela está madura."),
  n("higo", "el", "masculine", "animals_food_nature", "fig", "fruit food", "El higo está dulce."),
  n("calabaza", "la", "feminine", "food_drink_shopping", "pumpkin", "vegetable food", "La calabaza está en la cocina."),
  n("apio", "el", "masculine", "food_drink_shopping", "celery", "vegetable food", "El apio está fresco."),
  n("puerro", "el", "masculine", "food_drink_shopping", "leek", "vegetable food", "El puerro está en la sopa."),
  n("pimiento", "el", "masculine", "food_drink_shopping", "pepper", "vegetable food", "El pimiento es rojo."),
  n("canela", "la", "feminine", "food_drink_shopping", "cinnamon", "spice", "La canela está en el postre."),
  n("vainilla", "la", "feminine", "food_drink_shopping", "vanilla", "flavor", "La vainilla huele bien."),
  v("estacionar", "-ar", "transport_travel_verbs", "to park", "parking a car", "Estaciono el coche cerca.", "Estaciono el auto cerca."),
  v("frenar", "-ar", "transport_travel_verbs", "to brake", "driving action", "Freno antes de la curva."),
  v("girar", "-ar", "transport_travel_verbs", "to turn", "changing direction", "Giro a la derecha."),
  v("volar", "irregular", "transport_travel_verbs", "to fly", "air travel", "Vuelo a Lima mañana."),
  v("aterrizar", "-ar", "transport_travel_verbs", "to land", "plane landing", "El avión aterriza pronto."),
  v("nacer", "irregular", "daily_life_verbs", "to be born", "birth", "El bebé nace en mayo."),
  v("morir", "irregular", "daily_life_verbs", "to die", "end of life", "La planta muere sin agua."),
  v("crecer", "irregular", "daily_life_verbs", "to grow", "growing child", "El niño crece rápido."),
  v("secar", "-ar", "home_care_verbs", "to dry", "drying clothes", "Seco la ropa al sol."),
  v("planchar", "-ar", "home_care_verbs", "to iron", "ironing clothes", "Plancho la camisa."),
  v("barrer", "-er", "home_care_verbs", "to sweep", "cleaning floor", "Barro el suelo por la mañana."),
  v("ducharse", "-ar", "daily_routine_verbs", "to shower", "daily routine", "Me ducho antes de cenar."),
  v("vestirse", "irregular", "daily_routine_verbs", "to get dressed", "daily routine", "Me visto en el dormitorio."),
  v("peinarse", "-ar", "daily_routine_verbs", "to comb hair", "daily routine", "Me peino frente al espejo."),
  v("afeitarse", "-ar", "daily_routine_verbs", "to shave", "personal care", "Me afeito por la mañana."),
  v("maquillarse", "-ar", "daily_routine_verbs", "to put on makeup", "personal care", "Me maquillo para la fiesta."),
  v("bañarse", "-ar", "daily_routine_verbs", "to bathe", "personal care", "Me baño por la noche."),
  v("acostarse", "irregular", "daily_routine_verbs", "to go to bed", "daily routine", "Me acuesto temprano."),
  v("despertarse", "irregular", "daily_routine_verbs", "to wake up", "daily routine", "Me despierto a las siete."),
  v("sonreír", "-ir", "daily_life_verbs", "to smile", "friendly action", "Sonrío cuando veo a mi amiga."),
  adj("amargo", "food_adjectives", "bitter", "bitter food", "El café está amargo."),
  adj("ácido", "food_adjectives", "acidic or sour", "sour fruit", "El limón es ácido."),
  adj("fresco", "food_adjectives", "fresh", "fresh food", "El pescado está fresco."),
  adj("maduro", "food_adjectives", "ripe", "ripe fruit", "El mango está maduro."),
  adj("crudo", "food_adjectives", "raw", "raw food", "La carne está cruda."),
  adj("cocido", "food_adjectives", "cooked or boiled", "cooked food", "El arroz está cocido."),
  adj("útil", "adjectives_part005", "useful", "useful object", "El mapa es útil."),
  adj("normal", "adjectives_part005", "normal", "ordinary situation", "La situación es normal."),
  adj("raro", "adjectives_part005", "strange or rare", "strange sound", "El ruido es raro."),
  adj("perfecto", "adjectives_part005", "perfect", "perfect answer", "La respuesta es perfecta."),

  x("adverb", "anoche", "time_sequence_part005", "last night", "past evening", "Anoche cené en casa."),
  x("adverb", "todavía", "time_sequence_part005", "still or yet", "continuing state", "Todavía necesito ayuda."),
  x("adverb", "ya", "time_sequence_part005", "already or now", "completed action", "Ya tengo el billete.", "Ya tengo el boleto."),
  x("adverb", "pronto", "time_sequence_part005", "soon", "near future", "El tren llega pronto."),
  x("adverb", "luego", "time_sequence_part005", "later", "later action", "Luego llamo a mi madre."),
  x("adverb", "antes", "time_sequence_part005", "before", "earlier time", "Antes trabajo en casa."),
  x("adverb", "después", "time_sequence_part005", "afterward", "later step", "Después voy al mercado."),
  x("adverb", "tarde", "time_sequence_part005", "late", "late arrival", "Llego tarde a clase."),
  x("adverb", "jamás", "time_sequence_part005", "never", "strong negative time", "Jamás bebo café de noche."),
  n("junio", "not_applicable", "masculine", "calendar_part005", "June", "month name", "Junio empieza mañana."),
  n("julio", "not_applicable", "masculine", "calendar_part005", "July", "month name", "Julio es caluroso."),
  n("agosto", "not_applicable", "masculine", "calendar_part005", "August", "month name", "Agosto termina pronto."),
  n("septiembre", "not_applicable", "masculine", "calendar_part005", "September", "month name", "Septiembre trae clases."),
  n("octubre", "not_applicable", "masculine", "calendar_part005", "October", "month name", "Octubre tiene días frescos."),
  n("noviembre", "not_applicable", "masculine", "calendar_part005", "November", "month name", "Noviembre llega después."),
  n("diciembre", "not_applicable", "masculine", "calendar_part005", "December", "month name", "Diciembre es un mes frío."),
  n("primavera", "la", "feminine", "calendar_part005", "spring", "season", "La primavera tiene flores."),
  n("otoño", "el", "masculine", "calendar_part005", "autumn", "season", "El otoño trae lluvia."),
  x("numeral", "ciento", "numbers_part005", "one hundred", "counting more than one hundred", "Hay ciento veinte páginas."),
  x("numeral", "doscientos", "numbers_part005", "two hundred", "counting money", "El curso cuesta doscientos euros."),
  x("numeral", "quinientos", "numbers_part005", "five hundred", "counting distance", "El viaje tiene quinientos kilómetros."),
  n("millón", "el", "masculine", "numbers_part005", "million", "large number", "La ciudad tiene un millón de personas."),
  n("docena", "la", "feminine", "numbers_part005", "dozen", "counting eggs", "Compro una docena de huevos."),

  n("enfermero", "el", "masculine", "people_work_part005", "male nurse", "hospital worker", "El enfermero ayuda al paciente."),
  n("enfermera", "la", "feminine", "people_work_part005", "female nurse", "hospital worker", "La enfermera trae la medicina."),
  n("maestro", "el", "masculine", "people_school_part005", "male teacher", "school teacher", "El maestro explica la tarea."),
  n("maestra", "la", "feminine", "people_school_part005", "female teacher", "school teacher", "La maestra escribe una nota."),
  n("alumno", "el", "masculine", "people_school_part005", "male pupil", "school learner", "El alumno repite la frase."),
  n("alumna", "la", "feminine", "people_school_part005", "female pupil", "school learner", "La alumna prepara el examen."),
  n("jefe", "el", "masculine", "people_work_part005", "male boss", "work role", "El jefe firma el documento."),
  n("jefa", "la", "feminine", "people_work_part005", "female boss", "work role", "La jefa organiza la reunión."),
  n("empleado", "el", "masculine", "people_work_part005", "male employee", "work role", "El empleado llega temprano."),
  n("empleada", "la", "feminine", "people_work_part005", "female employee", "work role", "La empleada abre la oficina."),
  n("vecino", "el", "masculine", "people_social_part005", "male neighbor", "nearby person", "Mi vecino tiene un perro."),
  n("vecina", "la", "feminine", "people_social_part005", "female neighbor", "nearby person", "Mi vecina riega las plantas."),
  n("invitado", "el", "masculine", "people_social_part005", "male guest", "guest at home", "El invitado trae flores."),
  n("invitada", "la", "feminine", "people_social_part005", "female guest", "guest at home", "La invitada toma café."),
  n("secretario", "el", "masculine", "people_work_part005", "male secretary", "office role", "El secretario responde el correo."),
  n("secretaria", "la", "feminine", "people_work_part005", "female secretary", "office role", "La secretaria prepara la cita."),
  n("piloto", "not_applicable", "common", "people_transport_part005", "pilot", "transport role", "La piloto vuela hoy."),
  n("guía", "not_applicable", "common", "people_travel_part005", "guide", "travel role", "El guía muestra el museo."),
  n("repartidor", "el", "masculine", "people_services_part005", "male delivery worker", "delivery role", "El repartidor trae el paquete."),
  n("repartidora", "la", "feminine", "people_services_part005", "female delivery worker", "delivery role", "La repartidora llama a la puerta."),
  n("mensajero", "el", "masculine", "people_services_part005", "male messenger", "delivery role", "El mensajero deja una carta."),
  n("mensajera", "la", "feminine", "people_services_part005", "female messenger", "delivery role", "La mensajera espera abajo."),
  n("guardia", "not_applicable", "common", "people_services_part005", "guard", "security role", "El guardia mira la entrada."),
  n("empresario", "el", "masculine", "people_work_part005", "businessman", "business role", "El empresario visita la fábrica."),
  n("empresaria", "la", "feminine", "people_work_part005", "businesswoman", "business role", "La empresaria lee el contrato."),
  n("administrativo", "el", "masculine", "people_work_part005", "male administrative worker", "office role", "El administrativo revisa el formulario."),
  n("administrativa", "la", "feminine", "people_work_part005", "female administrative worker", "office role", "La administrativa guarda el archivo."),

  n("armario", "el", "masculine", "home_objects_part005", "wardrobe or cabinet", "home storage", "El armario tiene ropa."),
  n("estante", "el", "masculine", "home_objects_part005", "shelf", "home storage", "El estante tiene libros."),
  n("cajón", "el", "masculine", "home_objects_part005", "drawer", "home storage", "El cajón está cerrado."),
  n("manta", "la", "feminine", "home_objects_part005", "blanket", "bed item", "La manta está sobre la cama."),
  n("almohada", "la", "feminine", "home_objects_part005", "pillow", "bed item", "La almohada es blanca."),
  n("sábana", "la", "feminine", "home_objects_part005", "sheet", "bed item", "La sábana está limpia."),
  n("toalla", "la", "feminine", "home_objects_part005", "towel", "bathroom item", "La toalla está seca."),
  n("espejo", "el", "masculine", "home_objects_part005", "mirror", "bathroom object", "El espejo está limpio."),
  n("alfombra", "la", "feminine", "home_objects_part005", "rug or carpet", "floor covering", "La alfombra es azul."),
  n("cortina", "la", "feminine", "home_objects_part005", "curtain", "window covering", "La cortina está abierta."),
  n("lámpara", "la", "feminine", "home_objects_part005", "lamp", "home light", "La lámpara está encendida."),
  n("enchufe", "el", "masculine", "home_objects_part005", "socket or plug", "electric socket", "El enchufe está junto a la mesa."),
  n("horno", "el", "masculine", "home_kitchen_part005", "oven", "kitchen appliance", "El horno está caliente."),
  n("microondas", "el", "masculine", "home_kitchen_part005", "microwave", "kitchen appliance", "El microondas calienta la sopa."),
  n("nevera", "la", "feminine", "home_kitchen_part005", "refrigerator", "kitchen appliance", "La nevera tiene leche."),
  n("frigorífico", "el", "masculine", "home_kitchen_part005", "refrigerator", "kitchen appliance", "El frigorífico está lleno."),
  n("lavadora", "la", "feminine", "home_objects_part005", "washing machine", "home appliance", "La lavadora hace ruido."),
  n("aspiradora", "la", "feminine", "home_objects_part005", "vacuum cleaner", "cleaning appliance", "La aspiradora está en el armario."),
  n("jabón", "el", "masculine", "home_health_part005", "soap", "washing item", "El jabón está en el baño."),
  n("champú", "el", "masculine", "home_health_part005", "shampoo", "bathroom item", "El champú huele bien."),
  n("salón", "el", "masculine", "home_rooms_part005", "living room", "home room", "El salón tiene un sofá."),
  n("comedor", "el", "masculine", "home_rooms_part005", "dining room", "home room", "El comedor tiene una mesa grande."),
  n("dormitorio", "el", "masculine", "home_rooms_part005", "bedroom", "home room", "El dormitorio está tranquilo."),
  n("garaje", "el", "masculine", "home_rooms_part005", "garage", "home space", "El garaje tiene una bicicleta."),
  n("jardín", "el", "masculine", "home_rooms_part005", "garden", "home outside", "El jardín tiene flores."),
  n("balcón", "el", "masculine", "home_rooms_part005", "balcony", "home outside", "El balcón mira al parque."),
  n("escalera", "la", "feminine", "home_building_part005", "stairs", "building route", "La escalera sube al segundo piso."),
  n("ascensor", "el", "masculine", "home_building_part005", "elevator", "building route", "El ascensor está lleno."),
  n("pasillo", "el", "masculine", "home_building_part005", "hallway", "building route", "El pasillo es largo."),
  n("techo", "el", "masculine", "home_building_part005", "ceiling or roof", "room top", "El techo es bajo."),
  n("pared", "la", "feminine", "home_building_part005", "wall", "room wall", "La pared es blanca."),
  n("suelo", "el", "masculine", "home_building_part005", "floor", "room floor", "El suelo está limpio."),

  n("mantequilla", "la", "feminine", "food_drink_shopping", "butter", "breakfast food", "La mantequilla está en el pan."),
  n("mermelada", "la", "feminine", "food_drink_shopping", "jam", "breakfast food", "La mermelada es de fresa."),
  n("yogur", "el", "masculine", "food_drink_shopping", "yogurt", "dairy food", "El yogur está frío."),
  n("cereal", "el", "masculine", "food_drink_shopping", "cereal", "breakfast food", "El cereal está en el bol."),
  n("harina", "la", "feminine", "food_drink_shopping", "flour", "cooking ingredient", "La harina está en la bolsa."),
  n("miel", "la", "feminine", "food_drink_shopping", "honey", "sweet food", "La miel está en el té."),
  n("vinagre", "el", "masculine", "food_drink_shopping", "vinegar", "salad ingredient", "El vinagre está en la ensalada."),
  n("pimienta", "la", "feminine", "food_drink_shopping", "pepper spice", "spice", "La pimienta está en la mesa."),
  n("ajo", "el", "masculine", "food_drink_shopping", "garlic", "cooking ingredient", "El ajo huele fuerte."),
  n("zanahoria", "la", "feminine", "food_drink_shopping", "carrot", "vegetable food", "La zanahoria está en la sopa."),
  n("lechuga", "la", "feminine", "food_drink_shopping", "lettuce", "salad vegetable", "La lechuga está fresca."),
  n("pepino", "el", "masculine", "food_drink_shopping", "cucumber", "salad vegetable", "El pepino está en la ensalada."),
  n("maíz", "el", "masculine", "food_drink_shopping", "corn", "food ingredient", "El maíz está dulce."),
  n("champiñón", "el", "masculine", "food_drink_shopping", "mushroom", "food ingredient", "El champiñón está en la pizza."),
  n("galleta", "la", "feminine", "food_drink_shopping", "cookie or biscuit", "sweet food", "La galleta está crujiente."),
  n("helado", "el", "masculine", "food_drink_shopping", "ice cream", "dessert", "El helado está frío."),
  n("postre", "el", "masculine", "food_drink_shopping", "dessert", "sweet course", "El postre llega después."),
  n("almuerzo", "el", "masculine", "food_drink_shopping", "lunch", "midday meal", "El almuerzo empieza a la una."),
  n("merienda", "la", "feminine", "food_drink_shopping", "afternoon snack", "small meal", "La merienda tiene fruta."),
  n("bebida", "la", "feminine", "food_drink_shopping", "drink", "cold drink", "La bebida está fría."),

  n("ropa", "la", "feminine", "clothing_part005", "clothes", "clothing in general", "La ropa está en el armario."),
  n("abrigo", "el", "masculine", "clothing_part005", "coat", "winter clothing", "El abrigo es largo."),
  n("chaqueta", "la", "feminine", "clothing_part005", "jacket", "outerwear", "La chaqueta está en la silla."),
  n("camisa", "la", "feminine", "clothing_part005", "shirt", "clothing item", "La camisa es blanca."),
  n("camiseta", "la", "feminine", "clothing_part005", "T-shirt", "clothing item", "La camiseta es cómoda."),
  n("pantalón", "el", "masculine", "clothing_part005", "trousers or pants", "clothing item", "El pantalón es negro."),
  n("falda", "la", "feminine", "clothing_part005", "skirt", "clothing item", "La falda es azul."),
  n("vestido", "el", "masculine", "clothing_part005", "dress", "clothing item", "El vestido es elegante."),
  n("zapato", "el", "masculine", "clothing_part005", "shoe", "footwear", "El zapato está limpio."),
  n("zapatilla", "la", "feminine", "clothing_part005", "sneaker or slipper", "footwear", "La zapatilla está junto a la cama."),
  n("calcetín", "el", "masculine", "clothing_part005", "sock", "footwear", "El calcetín está mojado."),
  n("gorra", "la", "feminine", "clothing_part005", "cap", "headwear", "La gorra protege del sol."),
  n("sombrero", "el", "masculine", "clothing_part005", "hat", "headwear", "El sombrero está en la mesa."),
  n("traje", "el", "masculine", "clothing_part005", "suit", "formal clothing", "El traje es nuevo."),
  n("suéter", "el", "masculine", "clothing_part005", "sweater", "warm clothing", "El suéter es verde."),
  n("bañador", "el", "masculine", "clothing_part005", "swimsuit", "swim clothing", "El bañador está seco."),

  n("fiebre", "la", "feminine", "health_part005", "fever", "health symptom", "Tengo fiebre esta noche."),
  n("dolor", "el", "masculine", "health_part005", "pain", "health symptom", "El dolor empieza ahora."),
  n("pastilla", "la", "feminine", "health_part005", "pill", "medicine", "La pastilla está en la mesa."),
  n("medicina", "la", "feminine", "health_part005", "medicine", "health item", "La medicina ayuda mucho."),
  n("receta", "la", "feminine", "health_part005", "prescription or recipe", "doctor paper", "La receta está en la farmacia."),
  n("consulta", "la", "feminine", "health_part005", "consultation", "doctor visit", "La consulta dura veinte minutos."),
  n("cita", "la", "feminine", "health_admin_part005", "appointment", "planned meeting", "Tengo una cita mañana."),
  n("paciente", "not_applicable", "common", "health_part005", "patient", "person at clinic", "La paciente espera al médico."),
  n("clínica", "la", "feminine", "health_part005", "clinic", "health place", "La clínica está cerca."),
  n("emergencia", "la", "feminine", "health_part005", "emergency", "urgent event", "La emergencia termina pronto."),

  n("avión", "el", "masculine", "transport_part005", "airplane", "air travel", "El avión sale a las seis."),
  n("barco", "el", "masculine", "transport_part005", "boat or ship", "water travel", "El barco llega al puerto."),
  n("bicicleta", "la", "feminine", "transport_part005", "bicycle", "city transport", "La bicicleta está en el garaje."),
  n("metro", "el", "masculine", "transport_part005", "metro", "city transport", "El metro va al centro."),
  n("tranvía", "el", "masculine", "transport_part005", "tram", "city transport", "El tranvía pasa por la plaza."),
  n("puerto", "el", "masculine", "transport_part005", "port", "travel place", "El puerto tiene barcos."),
  n("semáforo", "el", "masculine", "transport_part005", "traffic light", "street object", "El semáforo está rojo."),
  n("acera", "la", "feminine", "transport_part005", "sidewalk", "street side", "La acera está limpia."),
  n("puente", "el", "masculine", "transport_part005", "bridge", "road structure", "El puente cruza el río."),
  n("gasolina", "la", "feminine", "transport_part005", "gasoline", "car fuel", "La gasolina está cara."),
  n("aparcamiento", "el", "masculine", "transport_part005", "parking lot", "parking place", "El aparcamiento está lleno."),
  n("pasaporte", "el", "masculine", "transport_part005", "passport", "travel document", "El pasaporte está en la mochila."),
  n("aduana", "la", "feminine", "transport_part005", "customs", "border control", "La aduana abre temprano."),
  n("maleta", "la", "feminine", "transport_part005", "suitcase", "travel bag", "La maleta pesa mucho."),

  n("río", "el", "masculine", "nature_part005", "river", "natural water", "El río pasa por la ciudad."),
  n("lago", "el", "masculine", "nature_part005", "lake", "natural water", "El lago está tranquilo."),
  n("montaña", "la", "feminine", "nature_part005", "mountain", "natural place", "La montaña tiene nieve."),
  n("playa", "la", "feminine", "nature_part005", "beach", "coastal place", "La playa está llena."),
  n("nieve", "la", "feminine", "weather_part005", "snow", "weather", "La nieve cae despacio."),
  n("lluvia", "la", "feminine", "weather_part005", "rain", "weather", "La lluvia empieza ahora."),
  n("sol", "el", "masculine", "weather_part005", "sun", "weather", "El sol calienta la terraza."),
  n("viento", "el", "masculine", "weather_part005", "wind", "weather", "El viento mueve la cortina."),
  n("nube", "la", "feminine", "weather_part005", "cloud", "weather", "La nube tapa el sol."),
  n("cielo", "el", "masculine", "weather_part005", "sky", "weather", "El cielo está claro."),
  n("temperatura", "la", "feminine", "weather_part005", "temperature", "weather value", "La temperatura baja por la noche."),
  n("clima", "el", "masculine", "weather_part005", "climate or weather", "weather condition", "El clima es seco."),
  n("aire", "el", "masculine", "weather_part005", "air", "air outside", "El aire está fresco."),
  n("tierra", "la", "feminine", "nature_part005", "earth or soil", "ground material", "La tierra está seca."),
  n("mundo", "el", "masculine", "nature_part005", "world", "general world", "El mundo es grande."),
  n("elefante", "el", "masculine", "animals_part005", "elephant", "large animal", "El elefante bebe agua."),
  n("león", "el", "masculine", "animals_part005", "lion", "wild animal", "El león duerme bajo el sol."),
  n("tigre", "el", "masculine", "animals_part005", "tiger", "wild animal", "El tigre camina despacio."),
  n("mono", "el", "masculine", "animals_part005", "monkey", "wild animal", "El mono come fruta."),
  n("oso", "el", "masculine", "animals_part005", "bear", "wild animal", "El oso vive en el bosque."),
  n("lobo", "el", "masculine", "animals_part005", "wolf", "wild animal", "El lobo corre de noche."),
  n("serpiente", "la", "feminine", "animals_part005", "snake", "small animal", "La serpiente está en la piedra."),
  n("tortuga", "la", "feminine", "animals_part005", "turtle", "slow animal", "La tortuga camina despacio."),
  n("pato", "el", "masculine", "animals_part005", "duck", "water bird", "El pato nada en el lago."),

  n("deporte", "el", "masculine", "leisure_part005", "sport", "activity", "El deporte ayuda a la salud."),
  n("fútbol", "el", "masculine", "leisure_part005", "football or soccer", "sport", "El fútbol es popular."),
  n("tenis", "el", "masculine", "leisure_part005", "tennis", "sport", "El tenis empieza a las cinco."),
  n("baloncesto", "el", "masculine", "leisure_part005", "basketball", "sport", "El baloncesto es divertido."),
  n("natación", "la", "feminine", "leisure_part005", "swimming", "sport", "La natación es buena para la espalda."),
  n("gimnasio", "el", "masculine", "leisure_part005", "gym", "exercise place", "El gimnasio abre temprano."),
  n("piscina", "la", "feminine", "leisure_part005", "pool", "swimming place", "La piscina está limpia."),
  n("cine", "el", "masculine", "leisure_part005", "cinema", "movie place", "El cine está cerca."),
  n("película", "la", "feminine", "leisure_part005", "movie", "watching a movie", "La película empieza pronto."),
  n("teatro", "el", "masculine", "leisure_part005", "theater", "show place", "El teatro está lleno."),
  n("concierto", "el", "masculine", "leisure_part005", "concert", "music event", "El concierto termina tarde."),
  n("canción", "la", "feminine", "leisure_part005", "song", "music item", "La canción es bonita."),
  n("baile", "el", "masculine", "leisure_part005", "dance", "social activity", "El baile empieza a las nueve."),
  n("música", "la", "feminine", "leisure_part005", "music", "listening activity", "La música suena fuerte."),
  n("guitarra", "la", "feminine", "leisure_part005", "guitar", "musical instrument", "La guitarra está en el salón."),
  n("juego", "el", "masculine", "leisure_part005", "game", "play activity", "El juego es fácil."),
  n("revista", "la", "feminine", "leisure_part005", "magazine", "reading item", "La revista tiene fotos."),

  n("clase", "la", "feminine", "study_admin_tech_part005", "class", "school session", "La clase empieza ahora."),
  n("curso", "el", "masculine", "study_admin_tech_part005", "course", "learning course", "El curso dura tres meses."),
  n("tarea", "la", "feminine", "study_admin_tech_part005", "homework or task", "school task", "La tarea es corta."),
  n("examen", "el", "masculine", "study_admin_tech_part005", "exam", "school test", "El examen es mañana."),
  n("pregunta", "la", "feminine", "study_admin_tech_part005", "question", "learning question", "La pregunta es fácil."),
  n("respuesta", "la", "feminine", "study_admin_tech_part005", "answer", "answer to question", "La respuesta está en el libro."),
  n("nota", "la", "feminine", "study_admin_tech_part005", "note or grade", "school note", "La nota está en la página."),
  n("prueba", "la", "feminine", "study_admin_tech_part005", "test or proof", "small test", "La prueba dura diez minutos."),
  n("diccionario", "el", "masculine", "study_admin_tech_part005", "dictionary", "learning tool", "El diccionario ayuda mucho."),
  n("correo", "el", "masculine", "study_admin_tech_part005", "mail or email", "message channel", "El correo llega hoy."),
  n("carta", "la", "feminine", "study_admin_tech_part005", "letter", "paper message", "La carta está en el buzón."),
  n("paquete", "el", "masculine", "study_admin_tech_part005", "package", "delivery item", "El paquete llega mañana."),
  n("dirección", "la", "feminine", "study_admin_tech_part005", "address or direction", "written address", "La dirección está en el papel."),
  n("número", "el", "masculine", "study_admin_tech_part005", "number", "written number", "El número está en la tarjeta."),
  n("documento", "el", "masculine", "study_admin_tech_part005", "document", "paper file", "El documento está firmado."),
  n("recibo", "el", "masculine", "study_admin_tech_part005", "receipt", "payment paper", "El recibo está en la bolsa."),
  n("efectivo", "el", "masculine", "study_admin_tech_part005", "cash", "payment method", "Pago en efectivo."),
  n("cambio", "el", "masculine", "study_admin_tech_part005", "change", "money returned", "El cambio está en la mano."),
  n("descuento", "el", "masculine", "study_admin_tech_part005", "discount", "shop price", "El descuento termina hoy."),
  n("oferta", "la", "feminine", "study_admin_tech_part005", "offer or sale", "shop price", "La oferta es buena."),
  n("compra", "la", "feminine", "study_admin_tech_part005", "purchase", "buying action", "La compra cuesta poco."),
  n("venta", "la", "feminine", "study_admin_tech_part005", "sale", "selling action", "La venta empieza mañana."),
  n("foto", "la", "feminine", "study_admin_tech_part005", "photo", "image", "La foto está en el móvil.", "La foto está en el celular."),
  n("imagen", "la", "feminine", "study_admin_tech_part005", "image", "digital image", "La imagen se ve bien."),
  n("sonido", "el", "masculine", "study_admin_tech_part005", "sound", "audio", "El sonido es fuerte."),
  n("luz", "la", "feminine", "study_admin_tech_part005", "light", "room light", "La luz está encendida."),
  n("red", "la", "feminine", "study_admin_tech_part005", "network", "internet connection", "La red funciona bien."),
  n("sitio", "el", "masculine", "study_admin_tech_part005", "site or place", "web place", "El sitio tiene información."),
  n("enlace", "el", "masculine", "study_admin_tech_part005", "link", "web link", "El enlace abre la página."),
  n("radio", "la", "feminine", "study_admin_tech_part005", "radio", "audio device", "La radio suena en la cocina."),
  n("televisión", "la", "feminine", "study_admin_tech_part005", "television", "home device", "La televisión está apagada."),
  n("programa", "el", "masculine", "study_admin_tech_part005", "program", "show or software", "El programa empieza ahora."),

  v("preparar", "-ar", "actions_part005", "to prepare", "preparing food", "Preparo la cena."),
  v("cortar", "-ar", "actions_part005", "to cut", "cutting food", "Corto el pan con cuidado."),
  v("mezclar", "-ar", "actions_part005", "to mix", "mixing food", "Mezclo la sopa."),
  v("hervir", "-ir", "actions_part005", "to boil", "boiling water", "Hiervo agua para el té."),
  v("freír", "-ir", "actions_part005", "to fry", "frying food", "Frío el pescado en la sartén."),
  v("probar", "irregular", "actions_part005", "to try or taste", "tasting food", "Pruebo la sopa."),
  v("servir", "irregular", "actions_part005", "to serve", "serving food", "Sirvo café a mi amiga."),
  v("pedir", "irregular", "actions_part005", "to ask for or order", "ordering food", "Pido una bebida."),
  v("reservar", "-ar", "actions_part005", "to reserve", "booking a table", "Reservo una mesa para dos."),
  v("alquilar", "-ar", "actions_part005", "to rent", "renting a room", "Alquilo un coche pequeño.", "Alquilo un auto pequeño."),
  v("conducir", "irregular", "actions_part005", "to drive", "driving a car", "Conduzco al trabajo."),
  v("enviar", "-ar", "actions_part005", "to send", "sending a message", "Envío un correo corto."),
  v("recibir", "-ir", "actions_part005", "to receive", "receiving a package", "Recibo un paquete."),
  v("perder", "irregular", "actions_part005", "to lose", "losing keys", "Pierdo las llaves a veces."),
  v("ganar", "-ar", "actions_part005", "to win or earn", "winning a game", "Gano el juego."),
  v("elegir", "irregular", "actions_part005", "to choose", "choosing an option", "Elijo una camisa azul."),
  v("olvidar", "-ar", "actions_part005", "to forget", "forgetting an item", "Olvido el número."),
  v("recordar", "irregular", "actions_part005", "to remember", "remembering a name", "Recuerdo tu nombre."),
  v("repetir", "irregular", "actions_part005", "to repeat", "repeating a phrase", "Repito la palabra despacio."),
  v("explicar", "-ar", "actions_part005", "to explain", "explaining a task", "Explico la tarea."),
  v("practicar", "-ar", "actions_part005", "to practice", "practicing Spanish", "Practico español cada día."),
  v("terminar", "-ar", "actions_part005", "to finish", "finishing work", "Termino el trabajo a las seis."),
  v("cambiar", "-ar", "actions_part005", "to change", "changing plans", "Cambio la fecha."),
  v("empezar", "irregular", "actions_part005", "to begin", "starting class", "Empiezo la clase ahora."),
  v("continuar", "-ar", "actions_part005", "to continue", "continuing work", "Continúo el curso."),
  v("seguir", "irregular", "actions_part005", "to follow or continue", "following a route", "Sigo la calle hasta el parque."),
  v("parar", "-ar", "actions_part005", "to stop", "stopping a car", "Paro el coche en la señal.", "Paro el auto en la señal."),
  v("subir", "-ir", "actions_part005", "to go up", "going upstairs", "Subo por la escalera."),
  v("bajar", "-ar", "actions_part005", "to go down", "going downstairs", "Bajo al sótano."),
  v("cruzar", "-ar", "actions_part005", "to cross", "crossing a street", "Cruzo la calle con cuidado."),
  v("visitar", "-ar", "actions_part005", "to visit", "visiting a place", "Visito el museo."),
  v("enseñar", "-ar", "actions_part005", "to teach or show", "showing a photo", "Enseño la foto a mi madre."),
  v("guardar", "-ar", "actions_part005", "to keep or save", "saving a file", "Guardo el archivo."),
  v("dibujar", "-ar", "actions_part005", "to draw", "drawing a picture", "Dibujo una casa."),
  v("cantar", "-ar", "actions_part005", "to sing", "singing a song", "Canto una canción."),
  v("bailar", "-ar", "actions_part005", "to dance", "dancing at a party", "Bailo con mi amiga."),
  v("nadar", "-ar", "actions_part005", "to swim", "swimming in a pool", "Nado en la piscina."),
  v("descansar", "-ar", "actions_part005", "to rest", "resting at home", "Descanso después del trabajo."),
  v("sentir", "irregular", "actions_part005", "to feel", "feeling well", "Me siento bien hoy."),
  v("dolerse", "irregular", "actions_part005", "to hurt", "body pain", "Me duele la cabeza."),

  adj("cómodo", "adjectives_part005", "comfortable", "comfortable chair", "El sillón es cómodo."),
  adj("incómodo", "adjectives_part005", "uncomfortable", "uncomfortable seat", "La silla es incómoda."),
  adj("seguro", "adjectives_part005", "safe or sure", "safe place", "El barrio es seguro."),
  adj("peligroso", "adjectives_part005", "dangerous", "dangerous road", "La carretera es peligrosa."),
  adj("tranquilo", "adjectives_part005", "calm or quiet", "quiet place", "La calle está tranquila."),
  adj("nervioso", "adjectives_part005", "nervous", "nervous person", "El alumno está nervioso."),
  adj("serio", "adjectives_part005", "serious", "serious person", "La jefa es seria."),
  adj("divertido", "adjectives_part005", "fun", "fun game", "El juego es divertido."),
  adj("aburrido", "adjectives_part005", "boring", "boring film", "La película es aburrida."),
  adj("interesante", "adjectives_part005", "interesting", "interesting book", "El libro es interesante."),
  adj("importante", "adjectives_part005", "important", "important document", "El documento es importante."),
  adj("necesario", "adjectives_part005", "necessary", "necessary item", "El pasaporte es necesario."),
  adj("posible", "adjectives_part005", "possible", "possible plan", "El viaje es posible."),
  adj("imposible", "adjectives_part005", "impossible", "impossible task", "La tarea parece imposible."),
  adj("diferente", "adjectives_part005", "different", "different option", "La respuesta es diferente."),
  adj("igual", "adjectives_part005", "same or equal", "same price", "El precio es igual."),
  adj("fuerte", "adjectives_part005", "strong or loud", "strong wind", "El viento es fuerte."),
  adj("débil", "adjectives_part005", "weak", "weak signal", "La señal es débil."),
  adj("ligero", "adjectives_part005", "lightweight", "light bag", "La maleta es ligera."),
  adj("pesado", "adjectives_part005", "heavy", "heavy bag", "El paquete es pesado."),
  adj("lleno", "adjectives_part005", "full", "full room", "El comedor está lleno."),
  adj("vacío", "adjectives_part005", "empty", "empty glass", "El vaso está vacío."),
  adj("dulce", "food_adjectives", "sweet", "sweet dessert", "El postre está dulce."),
  adj("salado", "food_adjectives", "salty", "salty food", "El queso está salado."),
  adj("picante", "food_adjectives", "spicy", "spicy sauce", "La salsa está picante."),
  adj("sano", "health_adjectives", "healthy", "healthy food", "La comida es sana."),
  adj("elegante", "adjectives_part005", "elegant", "elegant dress", "El vestido es elegante."),
  adj("moderno", "adjectives_part005", "modern", "modern building", "El edificio es moderno."),
  adj("antiguo", "adjectives_part005", "old or ancient", "old house", "La casa es antigua."),
  adj("famoso", "adjectives_part005", "famous", "famous place", "El teatro es famoso."),
  adj("popular", "adjectives_part005", "popular", "popular sport", "El fútbol es popular."),
  adj("privado", "adjectives_part005", "private", "private room", "La sala es privada."),
  adj("público", "adjectives_part005", "public", "public place", "El parque es público."),
  adj("local", "adjectives_part005", "local", "local market", "El mercado es local."),
  adj("internacional", "adjectives_part005", "international", "international flight", "El vuelo es internacional."),

  n("olla", "la", "feminine", "home_kitchen_part005", "pot", "cooking pot", "La olla está en el fuego."),
  n("sartén", "la", "feminine", "home_kitchen_part005", "frying pan", "cooking pan", "La sartén tiene aceite."),
  n("cafetera", "la", "feminine", "home_kitchen_part005", "coffee maker", "kitchen appliance", "La cafetera prepara café."),
  n("tetera", "la", "feminine", "home_kitchen_part005", "teapot", "tea container", "La tetera está caliente."),
  n("bandeja", "la", "feminine", "home_kitchen_part005", "tray", "serving object", "La bandeja tiene vasos."),
  n("servilleta", "la", "feminine", "home_kitchen_part005", "napkin", "table item", "La servilleta está junto al plato."),
  n("mantel", "el", "masculine", "home_kitchen_part005", "tablecloth", "table item", "El mantel es blanco."),
  n("copa", "la", "feminine", "home_kitchen_part005", "wine glass", "drinking glass", "La copa está en la mesa."),
  n("jarra", "la", "feminine", "home_kitchen_part005", "jug or pitcher", "drink container", "La jarra tiene agua."),
  n("bol", "el", "masculine", "home_kitchen_part005", "bowl", "food container", "El bol tiene cereal."),
  n("recipiente", "el", "masculine", "home_kitchen_part005", "container", "storage object", "El recipiente está cerrado."),
  n("tijera", "la", "feminine", "home_tools_part005", "scissors", "cutting tool", "La tijera corta papel."),
  n("martillo", "el", "masculine", "home_tools_part005", "hammer", "tool", "El martillo está en la caja."),
  n("clavo", "el", "masculine", "home_tools_part005", "nail", "small tool item", "El clavo está en la pared."),
  n("tornillo", "el", "masculine", "home_tools_part005", "screw", "small tool item", "El tornillo está en el cajón."),
  n("destornillador", "el", "masculine", "home_tools_part005", "screwdriver", "tool", "El destornillador está en la mesa."),
  n("pegamento", "el", "masculine", "home_tools_part005", "glue", "repair item", "El pegamento está abierto."),
  n("cuerda", "la", "feminine", "home_tools_part005", "rope", "useful object", "La cuerda está en el garaje."),
  n("caja", "la", "feminine", "home_objects_part005", "box", "storage object", "La caja tiene juguetes."),
  n("juguete", "el", "masculine", "home_objects_part005", "toy", "child object", "El juguete está en el suelo."),
  n("muñeca", "la", "feminine", "home_objects_part005", "doll", "child object", "La muñeca está en la cama."),
  n("pelota", "la", "feminine", "leisure_part005", "ball", "play object", "La pelota está en el jardín."),
  n("bota", "la", "feminine", "clothing_part005", "boot", "footwear", "La bota está sucia."),
  n("sandalia", "la", "feminine", "clothing_part005", "sandal", "footwear", "La sandalia es cómoda."),
  n("corbata", "la", "feminine", "clothing_part005", "tie", "formal clothing", "La corbata es roja."),
  n("anillo", "el", "masculine", "clothing_part005", "ring", "accessory", "El anillo está en la mano."),
  n("collar", "el", "masculine", "clothing_part005", "necklace", "accessory", "El collar es bonito."),
  n("pulsera", "la", "feminine", "clothing_part005", "bracelet", "accessory", "La pulsera es de plata."),
  n("reloj", "el", "masculine", "clothing_part005", "watch or clock", "accessory", "El reloj marca las ocho."),
  n("cartera", "la", "feminine", "clothing_part005", "wallet", "personal item", "La cartera está en el bolso."),

  n("sandía", "la", "feminine", "food_drink_shopping", "watermelon", "fruit food", "La sandía está fría."),
  n("melón", "el", "masculine", "food_drink_shopping", "melon", "fruit food", "El melón está dulce."),
  n("durazno", "el", "masculine", "food_drink_shopping", "peach", "fruit food", "El durazno está maduro."),
  n("melocotón", "el", "masculine", "food_drink_shopping", "peach", "fruit food", "El melocotón está maduro.", "El durazno está maduro.", "durazno", "el"),
  n("piña", "la", "feminine", "food_drink_shopping", "pineapple", "fruit food", "La piña está dulce."),
  n("fresa", "la", "feminine", "food_drink_shopping", "strawberry", "fruit food", "La fresa está roja."),
  n("limón", "el", "masculine", "food_drink_shopping", "lemon", "fruit food", "El limón es ácido."),
  n("mango", "el", "masculine", "food_drink_shopping", "mango", "fruit food", "El mango está maduro."),
  n("pera", "la", "feminine", "food_drink_shopping", "pear", "fruit food", "La pera está verde."),
  n("cereza", "la", "feminine", "food_drink_shopping", "cherry", "fruit food", "La cereza es pequeña."),
  n("berenjena", "la", "feminine", "food_drink_shopping", "eggplant", "vegetable food", "La berenjena está en la cocina."),
  n("col", "la", "feminine", "food_drink_shopping", "cabbage", "vegetable food", "La col está en la sopa."),
  n("espinaca", "la", "feminine", "food_drink_shopping", "spinach", "vegetable food", "La espinaca está fresca."),
  n("guisante", "el", "masculine", "food_drink_shopping", "pea", "vegetable food", "El guisante está en el plato."),
  n("nuez", "la", "feminine", "food_drink_shopping", "walnut", "nut food", "La nuez está en el postre."),
  n("almendra", "la", "feminine", "food_drink_shopping", "almond", "nut food", "La almendra está en la tarta."),
  n("cacahuete", "el", "masculine", "food_drink_shopping", "peanut", "nut food", "El cacahuete está salado."),
  n("quesería", "la", "feminine", "food_drink_shopping", "cheese shop", "food shop", "La quesería abre temprano."),
  n("panadería", "la", "feminine", "food_drink_shopping", "bakery", "food shop", "La panadería vende pan."),
  n("carnicería", "la", "feminine", "food_drink_shopping", "butcher shop", "food shop", "La carnicería está cerrada."),
  n("pescadería", "la", "feminine", "food_drink_shopping", "fish shop", "food shop", "La pescadería tiene salmón."),
  n("frutería", "la", "feminine", "food_drink_shopping", "fruit shop", "food shop", "La frutería vende mangos."),
  n("carrito", "el", "masculine", "food_drink_shopping", "shopping cart", "shopping object", "El carrito está lleno."),
  n("cesta", "la", "feminine", "food_drink_shopping", "basket", "shopping object", "La cesta tiene fruta."),

  n("biblioteca", "la", "feminine", "places_part005", "library", "study place", "La biblioteca está abierta."),
  n("museo", "el", "masculine", "places_part005", "museum", "city place", "El museo tiene una exposición."),
  n("iglesia", "la", "feminine", "places_part005", "church", "city place", "La iglesia está en la plaza."),
  n("plaza", "la", "feminine", "places_part005", "square", "city place", "La plaza tiene una fuente."),
  n("fábrica", "la", "feminine", "places_part005", "factory", "work place", "La fábrica produce ropa."),
  n("empresa", "la", "feminine", "places_part005", "company", "work organization", "La empresa busca empleados."),
  n("municipio", "el", "masculine", "places_part005", "municipality", "local area", "El municipio tiene una oficina."),
  n("aldea", "la", "feminine", "places_part005", "village", "small place", "La aldea está cerca del río."),
  n("capital", "la", "feminine", "places_part005", "capital city", "city type", "La capital tiene mucho tráfico."),
  n("fuente", "la", "feminine", "places_part005", "fountain", "city object", "La fuente está en la plaza."),
  n("tráfico", "el", "masculine", "places_part005", "traffic", "city movement", "El tráfico es lento."),
  n("ruido", "el", "masculine", "places_part005", "noise", "city sound", "El ruido molesta por la noche."),

  n("espalda", "la", "feminine", "body_health_part005", "back", "body part", "Me duele la espalda."),
  n("corazón", "el", "masculine", "body_health_part005", "heart", "body organ", "El corazón late rápido."),
  n("sangre", "la", "feminine", "body_health_part005", "blood", "body fluid", "La sangre sale de la herida."),
  n("estómago", "el", "masculine", "body_health_part005", "stomach", "body part", "Me duele el estómago."),
  n("oído", "el", "masculine", "body_health_part005", "ear or hearing", "body part", "Me duele el oído."),
  n("nariz", "la", "feminine", "body_health_part005", "nose", "body part", "La nariz está roja."),
  n("boca", "la", "feminine", "body_health_part005", "mouth", "body part", "La boca está seca."),
  n("cabello", "el", "masculine", "body_health_part005", "hair", "body hair", "El cabello está mojado."),
  n("pelo", "el", "masculine", "body_health_part005", "hair", "body hair", "El pelo está corto."),
  n("oreja", "la", "feminine", "body_health_part005", "ear", "body part", "La oreja está fría."),
  n("diente", "el", "masculine", "body_health_part005", "tooth", "body part", "El diente duele."),
  n("muela", "la", "feminine", "body_health_part005", "molar tooth", "body part", "La muela duele mucho."),
  n("farmacéutico", "el", "masculine", "people_health_part005", "male pharmacist", "pharmacy worker", "El farmacéutico busca la medicina."),
  n("farmacéutica", "la", "feminine", "people_health_part005", "female pharmacist", "pharmacy worker", "La farmacéutica lee la receta."),

  n("alegría", "la", "feminine", "abstract_part005", "joy", "feeling", "La alegría se nota en su cara."),
  n("tristeza", "la", "feminine", "abstract_part005", "sadness", "feeling", "La tristeza pasa con el tiempo."),
  n("miedo", "el", "masculine", "abstract_part005", "fear", "feeling", "Tengo miedo de la tormenta."),
  n("hambre", "el", "feminine", "abstract_part005", "hunger", "feeling", "El hambre llega antes de comer."),
  n("sed", "la", "feminine", "abstract_part005", "thirst", "feeling", "Tengo sed después de correr."),
  n("suerte", "la", "feminine", "abstract_part005", "luck", "general idea", "Tengo suerte hoy."),
  n("sorpresa", "la", "feminine", "abstract_part005", "surprise", "unexpected event", "La sorpresa está en la caja."),
  n("problema", "el", "masculine", "abstract_part005", "problem", "simple issue", "El problema tiene solución."),
  n("solución", "la", "feminine", "abstract_part005", "solution", "answer to problem", "La solución es fácil."),
  n("vida", "la", "feminine", "abstract_part005", "life", "general life", "La vida en la ciudad es cara."),
  n("muerte", "la", "feminine", "abstract_part005", "death", "end of life", "La muerte del animal fue triste."),
  n("nacimiento", "el", "masculine", "abstract_part005", "birth", "birth event", "El nacimiento fue en junio."),
  n("amor", "el", "masculine", "abstract_part005", "love", "feeling", "El amor por la familia es fuerte."),
  n("amistad", "la", "feminine", "abstract_part005", "friendship", "relationship", "La amistad dura muchos años."),
  n("verdad", "la", "feminine", "abstract_part005", "truth", "true statement", "La verdad es importante."),
  n("mentira", "la", "feminine", "abstract_part005", "lie", "false statement", "La mentira causa problemas."),
  n("razón", "la", "feminine", "abstract_part005", "reason", "cause", "La razón es clara."),
  n("lugar", "el", "masculine", "abstract_part005", "place", "general place", "El lugar está cerca."),
  n("cosa", "la", "feminine", "abstract_part005", "thing", "general object", "La cosa está sobre la mesa."),
  n("forma", "la", "feminine", "abstract_part005", "shape or way", "object shape", "La forma es redonda."),
  n("modo", "el", "masculine", "abstract_part005", "way or mode", "way of doing", "El modo es sencillo."),
  n("manera", "la", "feminine", "abstract_part005", "way or manner", "way of doing", "La manera es práctica."),
  n("tipo", "el", "masculine", "abstract_part005", "type or kind", "category", "El tipo de comida es nuevo."),
  n("grupo", "el", "masculine", "abstract_part005", "group", "people group", "El grupo entra al museo."),
  n("parte", "la", "feminine", "abstract_part005", "part", "one part", "La parte final es corta."),
  n("resto", "el", "masculine", "abstract_part005", "rest or remainder", "remaining part", "El resto queda en la caja."),
  n("fin", "el", "masculine", "abstract_part005", "end", "final point", "El fin del curso está cerca."),

  v("aceptar", "-ar", "actions_part005", "to accept", "accepting an offer", "Acepto la oferta."),
  v("rechazar", "-ar", "actions_part005", "to reject", "rejecting an offer", "Rechazo la oferta cara."),
  v("permitir", "-ir", "actions_part005", "to allow", "allowing entry", "Permito la entrada."),
  v("prohibir", "-ir", "actions_part005", "to forbid", "forbidding action", "Prohíbo fumar aquí."),
  v("crear", "-ar", "actions_part005", "to create", "making something new", "Creo una lista."),
  v("construir", "irregular", "actions_part005", "to build", "building a house", "Construyo una casa pequeña."),
  v("destruir", "irregular", "actions_part005", "to destroy", "breaking badly", "El fuego destruye la mesa."),
  v("reparar", "-ar", "actions_part005", "to repair", "fixing an object", "Reparo la bicicleta."),
  v("romper", "-er", "actions_part005", "to break", "breaking an object", "Rompo el vaso sin querer."),
  v("llenar", "-ar", "actions_part005", "to fill", "filling a glass", "Lleno el vaso de agua."),
  v("vaciar", "-ar", "actions_part005", "to empty", "emptying a bag", "Vacío la bolsa."),
  v("manejar", "-ar", "actions_part005", "to drive or handle", "driving a car", "Manejo el coche despacio.", "Manejo el auto despacio."),
  v("arreglar", "-ar", "actions_part005", "to fix", "fixing a problem", "Arreglo el problema."),
  v("encantar", "-ar", "actions_part005", "to love or delight", "liking something", "Me encanta la música."),
  v("odiar", "-ar", "actions_part005", "to hate", "disliking something", "Odio el ruido fuerte."),
  v("preferir", "irregular", "actions_part005", "to prefer", "choosing preference", "Prefiero té sin azúcar."),
  v("prometer", "-er", "actions_part005", "to promise", "making a promise", "Prometo llegar temprano."),
  v("ofrecer", "irregular", "actions_part005", "to offer", "offering help", "Ofrezco ayuda a mi vecina."),
  v("quedar", "-ar", "actions_part005", "to remain or meet", "remaining time", "Queda una hora."),
  v("celebrar", "-ar", "actions_part005", "to celebrate", "party event", "Celebro mi cumpleaños."),
  v("invitar", "-ar", "actions_part005", "to invite", "inviting someone", "Invito a mi vecino."),
  v("felicitar", "-ar", "actions_part005", "to congratulate", "congratulating someone", "Felicito a mi hermana."),
  v("marcharse", "-ar", "actions_part005", "to leave", "leaving a place", "Me marcho después de cenar."),
  v("volver", "irregular", "actions_part005", "to return", "returning home", "Vuelvo a casa tarde."),
  v("subrayar", "-ar", "actions_part005", "to underline", "marking text", "Subrayo la palabra nueva."),
  v("borrar", "-ar", "actions_part005", "to erase", "erasing a word", "Borro la palabra de la pizarra."),
  v("firmar", "-ar", "actions_part005", "to sign", "signing a document", "Firmo el documento."),
  v("mandar", "-ar", "actions_part005", "to send", "sending a message", "Mando un mensaje corto."),
  v("salvar", "-ar", "actions_part005", "to save", "saving someone or something", "Salvo el archivo antes de cerrar."),
  v("aparecer", "irregular", "actions_part005", "to appear", "appearing on screen", "La imagen aparece en la pantalla."),
  v("desaparecer", "irregular", "actions_part005", "to disappear", "going out of sight", "La llave desaparece de la mesa."),
  v("sonar", "irregular", "actions_part005", "to sound or ring", "ringing phone", "El teléfono suena fuerte."),
  v("encajar", "-ar", "actions_part005", "to fit", "fitting an object", "La pieza encaja bien."),
  v("proteger", "irregular", "actions_part005", "to protect", "protecting someone", "El casco protege la cabeza."),
  v("quemar", "-ar", "actions_part005", "to burn", "burning food", "Quemo el pan sin querer."),
  v("enfriar", "-ar", "actions_part005", "to cool", "cooling food", "Enfrío la bebida con hielo."),
  v("calentar", "irregular", "actions_part005", "to heat", "heating food", "Caliento la sopa."),

  adj("caluroso", "weather_adjectives", "hot weather", "hot day", "El día es caluroso."),
  adj("templado", "weather_adjectives", "mild", "mild weather", "El clima es templado."),
  adj("soleado", "weather_adjectives", "sunny", "sunny day", "El día está soleado."),
  adj("nublado", "weather_adjectives", "cloudy", "cloudy sky", "El cielo está nublado."),
  adj("lluvioso", "weather_adjectives", "rainy", "rainy day", "El día está lluvioso."),
  adj("nevado", "weather_adjectives", "snowy", "snowy mountain", "La montaña está nevada."),
  adj("ordenado", "adjectives_part005", "tidy", "tidy room", "El dormitorio está ordenado."),
  adj("desordenado", "adjectives_part005", "messy", "messy room", "El salón está desordenado."),
  adj("rico", "adjectives_part005", "rich or tasty", "tasty food", "El postre está rico."),
  adj("pobre", "adjectives_part005", "poor", "poor person", "La familia es pobre."),
  adj("valiente", "adjectives_part005", "brave", "brave person", "La niña es valiente."),
  adj("tímido", "adjectives_part005", "shy", "shy person", "El alumno es tímido."),
  adj("generoso", "adjectives_part005", "generous", "generous person", "Mi vecino es generoso."),
  adj("paciente", "adjectives_part005", "patient", "patient person", "La maestra es paciente."),
  adj("activo", "adjectives_part005", "active", "active person", "El abuelo es activo."),
  adj("pasivo", "adjectives_part005", "passive", "passive behavior", "El alumno parece pasivo."),
  adj("curioso", "adjectives_part005", "curious", "curious child", "El niño es curioso."),
  adj("creativo", "adjectives_part005", "creative", "creative work", "La artista es creativa."),
  adj("responsable", "adjectives_part005", "responsible", "responsible worker", "El empleado es responsable."),
  adj("puntiagudo", "adjectives_part005", "pointed", "pointed object", "El lápiz está puntiagudo."),
  adj("redondo", "adjectives_part005", "round", "round shape", "La mesa es redonda."),
  adj("cuadrado", "adjectives_part005", "square", "square shape", "El papel es cuadrado."),
  adj("rectangular", "adjectives_part005", "rectangular", "rectangular object", "La caja es rectangular."),
  adj("transparente", "adjectives_part005", "transparent", "transparent glass", "El vaso es transparente."),
  adj("oscuro", "adjectives_part005", "dark", "dark room", "El pasillo está oscuro."),
  adj("claro", "adjectives_part005", "clear or light", "clear water", "El agua está clara."),

  n("oficio", "el", "masculine", "work_admin_part005", "trade or occupation", "work type", "El oficio requiere práctica."),
  n("profesión", "la", "feminine", "work_admin_part005", "profession", "work type", "La profesión de mi hermana es médica."),
  n("salario", "el", "masculine", "work_admin_part005", "salary", "work payment", "El salario llega cada mes."),
  n("sueldo", "el", "masculine", "work_admin_part005", "wage or salary", "work payment", "El sueldo paga el alquiler."),
  n("alquiler", "el", "masculine", "home_admin_part005", "rent", "home payment", "El alquiler es caro."),
  n("proyecto", "el", "masculine", "work_admin_part005", "project", "work plan", "El proyecto empieza hoy."),
  n("plan", "el", "masculine", "work_admin_part005", "plan", "planned action", "El plan cambia mañana."),
  n("equipo", "el", "masculine", "work_admin_part005", "team or equipment", "work team", "El equipo trabaja junto."),
  n("herramienta", "la", "feminine", "work_admin_part005", "tool", "work object", "La herramienta está limpia."),
  n("máquina", "la", "feminine", "work_admin_part005", "machine", "work object", "La máquina hace ruido."),
  n("reunión", "la", "feminine", "work_admin_part005", "meeting", "work event", "La reunión empieza a las diez."),
  n("horario", "el", "masculine", "work_admin_part005", "schedule", "time plan", "El horario está en la pared."),
  n("entrada", "la", "feminine", "places_admin_part005", "entrance or ticket", "entry point", "La entrada está a la derecha."),
  n("salida", "la", "feminine", "places_admin_part005", "exit", "exit point", "La salida está al fondo."),
  n("recepción", "la", "feminine", "places_admin_part005", "reception", "hotel desk", "La recepción está abierta."),
  n("llavín", "el", "masculine", "home_objects_part005", "small key", "small key object", "El llavín abre la puerta."),
  n("candado", "el", "masculine", "home_objects_part005", "padlock", "lock object", "El candado está cerrado."),
  n("cerradura", "la", "feminine", "home_objects_part005", "lock", "door part", "La cerradura no funciona."),
  n("tubo", "el", "masculine", "home_objects_part005", "tube or pipe", "house part", "El tubo tiene agua."),
  n("cableado", "el", "masculine", "home_objects_part005", "wiring", "electric part", "El cableado está detrás de la pared."),

  n("marisco", "el", "masculine", "food_drink_shopping", "seafood", "food category", "El marisco está fresco."),
  n("gamba", "la", "feminine", "food_drink_shopping", "shrimp", "seafood", "La gamba está en el plato."),
  n("camarón", "el", "masculine", "food_drink_shopping", "shrimp", "seafood", "El camarón está cocido."),
  n("mejillón", "el", "masculine", "food_drink_shopping", "mussel", "seafood", "El mejillón está en la olla."),
  n("tortilla", "la", "feminine", "food_drink_shopping", "omelet or tortilla", "food item", "La tortilla está caliente."),
  n("paella", "la", "feminine", "food_drink_shopping", "paella", "rice dish", "La paella tiene marisco."),
  n("gazpacho", "el", "masculine", "food_drink_shopping", "gazpacho", "cold soup", "El gazpacho está frío."),
  n("hamburguesa", "la", "feminine", "food_drink_shopping", "hamburger", "fast food", "La hamburguesa tiene queso."),
  n("pizza", "la", "feminine", "food_drink_shopping", "pizza", "fast food", "La pizza está en el horno."),
  n("filete", "el", "masculine", "food_drink_shopping", "steak or fillet", "meat food", "El filete está en el plato."),
  n("costilla", "la", "feminine", "food_drink_shopping", "rib", "meat food", "La costilla está caliente."),
  n("jamón", "el", "masculine", "food_drink_shopping", "ham", "meat food", "El jamón está en el sándwich."),
  n("salchicha", "la", "feminine", "food_drink_shopping", "sausage", "meat food", "La salchicha está en el pan."),
  n("chorizo", "el", "masculine", "food_drink_shopping", "chorizo", "meat food", "El chorizo tiene sabor fuerte."),
  n("tocino", "el", "masculine", "food_drink_shopping", "bacon", "meat food", "El tocino está crujiente."),

  n("zapatería", "la", "feminine", "shops_services_part005", "shoe shop", "shop", "La zapatería vende botas."),
  n("librería", "la", "feminine", "shops_services_part005", "bookshop", "shop", "La librería tiene diccionarios."),
  n("papelería", "la", "feminine", "shops_services_part005", "stationery shop", "shop", "La papelería vende cuadernos."),
  n("gasolinera", "la", "feminine", "shops_services_part005", "gas station", "service place", "La gasolinera está en la carretera."),
  n("comisaría", "la", "feminine", "shops_services_part005", "police station", "service place", "La comisaría está cerca del banco."),
  n("ayuntamiento", "el", "masculine", "shops_services_part005", "town hall", "public office", "El ayuntamiento abre a las nueve."),
  n("embajada", "la", "feminine", "shops_services_part005", "embassy", "official place", "La embajada está en la capital."),
  n("consulado", "el", "masculine", "shops_services_part005", "consulate", "official place", "El consulado ayuda a los turistas."),
  n("escáner", "el", "masculine", "study_admin_tech_part005", "scanner", "office machine", "El escáner copia el documento."),
  n("portátil", "el", "masculine", "study_admin_tech_part005", "laptop", "computer", "El portátil está en la mochila."),
  n("disco", "el", "masculine", "study_admin_tech_part005", "disk", "digital storage", "El disco guarda fotos."),
  n("clave", "la", "feminine", "study_admin_tech_part005", "key or password", "access word", "La clave es secreta."),
  n("usuario", "el", "masculine", "study_admin_tech_part005", "male user", "account person", "El usuario abre la aplicación."),
  n("usuaria", "la", "feminine", "study_admin_tech_part005", "female user", "account person", "La usuaria cambia la clave."),

  n("selva", "la", "feminine", "nature_part005", "jungle", "natural place", "La selva tiene muchos árboles."),
  n("volcán", "el", "masculine", "nature_part005", "volcano", "natural place", "El volcán está lejos."),
  n("cascada", "la", "feminine", "nature_part005", "waterfall", "natural place", "La cascada suena fuerte."),
  n("cerdo", "el", "masculine", "animals_part005", "pig", "farm animal", "El cerdo come mucho."),
  n("toro", "el", "masculine", "animals_part005", "bull", "farm animal", "El toro está en el campo."),
  n("cabra", "la", "feminine", "animals_part005", "goat", "farm animal", "La cabra sube la montaña."),
  n("burro", "el", "masculine", "animals_part005", "donkey", "farm animal", "El burro lleva una carga."),
  n("zorro", "el", "masculine", "animals_part005", "fox", "wild animal", "El zorro cruza el camino."),
  n("rana", "la", "feminine", "animals_part005", "frog", "small animal", "La rana salta al agua."),
  n("ratón", "el", "masculine", "animals_part005", "mouse", "small animal", "El ratón corre bajo la mesa."),
  n("ballena", "la", "feminine", "animals_part005", "whale", "sea animal", "La ballena nada en el océano."),
  n("delfín", "el", "masculine", "animals_part005", "dolphin", "sea animal", "El delfín salta en el mar."),

  v("abrazar", "-ar", "actions_part005", "to hug", "friendly action", "Abrazo a mi abuela."),
  v("besar", "-ar", "actions_part005", "to kiss", "friendly action", "Beso a mi hija en la frente."),
  v("llorar", "-ar", "actions_part005", "to cry", "sad action", "Lloro cuando estoy triste."),
  v("gritar", "-ar", "actions_part005", "to shout", "loud action", "Grito porque hay mucho ruido."),
  v("reír", "-ir", "actions_part005", "to laugh", "happy action", "Río con mis amigos."),
  v("discutir", "-ir", "actions_part005", "to discuss or argue", "talking about a problem", "Discuto el problema con calma."),
  v("conversar", "-ar", "actions_part005", "to converse", "friendly talk", "Converso con mi vecina."),
  v("charlar", "-ar", "actions_part005", "to chat", "informal talk", "Charlo con mi hermana."),
  v("contar", "irregular", "actions_part005", "to count or tell", "telling a story", "Cuento una historia corta."),
  v("narrar", "-ar", "actions_part005", "to narrate", "telling a story", "Narro una historia sencilla."),
  v("describir", "-ir", "actions_part005", "to describe", "describing a place", "Describo la casa."),
  v("informar", "-ar", "actions_part005", "to inform", "giving information", "Informo al cliente."),
  v("anunciar", "-ar", "actions_part005", "to announce", "public notice", "Anuncio la salida del tren."),
  v("publicar", "-ar", "actions_part005", "to publish", "posting information", "Publico una foto."),
  v("compartir", "-ir", "actions_part005", "to share", "sharing food", "Comparto el pan."),
  v("unir", "-ir", "actions_part005", "to join", "joining parts", "Uno las dos partes."),
  v("separar", "-ar", "actions_part005", "to separate", "separating items", "Separo la ropa blanca."),
  v("hornear", "-ar", "actions_part005", "to bake", "baking food", "Horneo pan por la mañana."),
  v("doblar", "-ar", "actions_part005", "to fold", "folding clothes", "Doblo la camisa."),
  v("saltar", "-ar", "actions_part005", "to jump", "jumping", "Salto sobre la piedra."),
  v("montar", "-ar", "actions_part005", "to ride or assemble", "riding a bike", "Monto en bicicleta."),
  v("pasear", "-ar", "actions_part005", "to stroll", "walking for leisure", "Paseo por el parque."),
  v("esquiar", "-ar", "actions_part005", "to ski", "winter sport", "Esquío en la montaña."),
  v("bucear", "-ar", "actions_part005", "to dive", "water sport", "Buceo en el mar."),

  adj("honesto", "adjectives_part005", "honest", "honest person", "El empleado es honesto."),
  adj("sincero", "adjectives_part005", "sincere", "sincere person", "La amiga es sincera."),
  adj("cruel", "adjectives_part005", "cruel", "bad behavior", "El comentario es cruel."),
  adj("justo", "adjectives_part005", "fair", "fair price", "El precio es justo."),
  adj("injusto", "adjectives_part005", "unfair", "unfair situation", "La situación es injusta."),
  adj("legal", "adjectives_part005", "legal", "legal document", "El contrato es legal."),
  adj("ilegal", "adjectives_part005", "illegal", "illegal action", "La venta es ilegal."),
  adj("urgente", "adjectives_part005", "urgent", "urgent problem", "El problema es urgente."),
  adj("básico", "adjectives_part005", "basic", "basic course", "El curso es básico."),
  adj("avanzado", "adjectives_part005", "advanced", "advanced class", "La clase es avanzada."),
  adj("central", "adjectives_part005", "central", "central location", "La oficina es central."),
  adj("principal", "adjectives_part005", "main", "main door", "La puerta principal está abierta."),
  adj("secundario", "adjectives_part005", "secondary", "secondary option", "La opción secundaria es barata."),
  adj("personal", "adjectives_part005", "personal", "personal item", "La información es personal."),
  adj("familiar", "adjectives_part005", "family-related", "family situation", "La reunión es familiar."),
  adj("laboral", "adjectives_part005", "work-related", "work issue", "El horario laboral termina a las seis."),
  adj("escolar", "adjectives_part005", "school-related", "school item", "El calendario escolar empieza en septiembre."),
  adj("médico", "adjectives_part005", "medical", "medical visit", "La cita médica es mañana."),
  adj("dental", "adjectives_part005", "dental", "dental appointment", "La consulta dental dura poco."),
  adj("turístico", "adjectives_part005", "tourist", "tourist place", "El mapa turístico es útil."),
  adj("cultural", "adjectives_part005", "cultural", "cultural event", "El evento cultural empieza hoy."),
  adj("natural", "adjectives_part005", "natural", "natural place", "El parque natural es grande."),
  adj("artificial", "adjectives_part005", "artificial", "artificial light", "La luz artificial está encendida."),
  adj("eléctrico", "adjectives_part005", "electric", "electric device", "El coche eléctrico está cargado."),
  adj("electrónico", "adjectives_part005", "electronic", "electronic device", "El documento electrónico llega por correo."),
  adj("manual", "adjectives_part005", "manual", "manual work", "El trabajo manual es lento."),
  adj("digital", "adjectives_part005", "digital", "digital file", "El archivo digital está guardado."),
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
  const paths = [1, 2, 3, 4].map((part) =>
    path.join(ROOT, `outputs/spanish-a1-core/candidate-pools/spanish_a1_core_part_${String(part).padStart(3, "0")}_300_v1_candidate_pool.jsonl`)
  );
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
      throw new Error(`Duplicate Part 005 backlog source lemma/POS: ${key} at rows ${seenBacklogKeys.get(key)} and ${index + 1}.`);
    }
    seenBacklogKeys.set(key, index + 1);
    if (existingKeys.has(key)) {
      skippedPrevious.push(key);
      continue;
    }
    if (selected.length < 300) selected.push(candidate);
  }

  if (selected.length !== 300) {
    throw new Error(`Part 005 selected ${selected.length} non-overlapping entries, expected 300. Backlog=${candidateBacklog.length}, skipped_previous=${skippedPrevious.length}.`);
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

function resetContract(part004) {
  return {
    contract_id: "spanish_a1_core_release_contract_v1::spanish_a1_core_part_005_300_v1",
    status: "source_candidate_scaffold_ready",
    scope:
      "Spanish A1 course-prep vocabulary release workbook Part 005, separate from ordinary thematic decks, Oxford English vocabulary, HSK Classic and HSK 3.0; final buyer-facing delivery requires separate Spanish (Spain) and Latin American Spanish edition workbooks.",
    approved_for_generation: false,
    source_candidate_file: "config/spanish-a1-core-part-005-candidates.tsv",
    release_part: {
      part_number: 5,
      row_id_start: 1201,
      meaning_namespace: "spanish_a1::part_005",
      selected_scope:
        "Internal LunaCards continuation of Spanish A1 Core after Parts 001-004; additional A1/A1+ time, people, home, food, clothing, health, transport, nature, leisure, study/admin/tech, common verbs and adjectives.",
    },
    default_release: {
      release_id: RELEASE_ID,
      course_id: "spanish_a1_core",
      cefr_level: "A1",
      expected_row_count: 300,
    },
    course: part004.course,
    source_policy: part004.source_policy,
    row_identity: part004.row_identity,
    field_rules: part004.field_rules,
    workbook: {
      ...part004.workbook,
      main_sheet_name: "Spanish A1 Core Part 005",
      postgres_import: false,
      ordinary_deck_sort: null,
      isolated_db_storage: {
        ...part004.workbook.isolated_db_storage,
        source_only_saved: false,
        final_support_storage_ready: false,
      },
      google_sheet_created: false,
      final_delivery_ready: false,
    },
    qa_gates: part004.qa_gates,
    ai_tool_policy: {
      ...part004.ai_tool_policy,
      latest_explicit_user_confirmation: null,
      part005_note:
        "No Part 005 live Gemini/support-language generation approval is inherited from earlier parts. Subscription-backed Gemini CLI use must be explicitly confirmed before live generation; no paid API key and no model downgrade.",
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

  const part004 = await readJson(path.join(ROOT, "config/spanish-a1-core-part-004-release-contract-v1.json"));
  await writeJson(CONTRACT_PATH, resetContract(part004));

  const latamMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-004-course-metadata.json"));
  const spainMetadata = await readJson(path.join(ROOT, "config/spanish-a1-core-part-004-course-metadata-spain.json"));
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
