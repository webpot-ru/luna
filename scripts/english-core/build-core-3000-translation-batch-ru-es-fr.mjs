#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  })
);

const releaseId = args.get("release") ?? "english_core_3000_a1_a2_part_001_150_v1";
const inputPath = path.resolve(
  args.get("input") ??
    `outputs/english-core-3000/en-transcriptions/${releaseId}_en_transcriptions_v1.jsonl`
);
const outputDir = path.resolve(args.get("out-dir") ?? "outputs/english-core-3000/translation-batches");

const translations = {
  core3000_0001: {
    RU: ["определённый артикль", "Дверь открыта."],
    ES: ["el; la; los; las", "La puerta está abierta."],
    FR: ["le; la; les; l'", "La porte est ouverte."],
  },
  core3000_0002: {
    RU: ["быть", "Я хочу быть готовым."],
    ES: ["ser; estar", "Quiero estar listo."],
    FR: ["être", "Je veux être prêt."],
  },
  core3000_0003: {
    RU: ["и", "Чай и вода на столе."],
    ES: ["y", "El té y el agua están en la mesa."],
    FR: ["et", "Le thé et l'eau sont sur la table."],
  },
  core3000_0004: {
    RU: ["родительный падеж; из", "Чашка чая горячая."],
    ES: ["de", "Una taza de té está caliente."],
    FR: ["de", "Une tasse de thé est chaude."],
  },
  core3000_0005: {
    RU: ["инфинитивная форма", "Я хочу пойти домой."],
    ES: ["a; para", "Quiero ir a casa."],
    FR: ["à; de", "Je veux rentrer à la maison."],
  },
  core3000_0006: {
    RU: ["неопределённый артикль", "У меня есть книга."],
    ES: ["un; una", "Tengo un libro."],
    FR: ["un; une", "J'ai un livre."],
  },
  core3000_0007: {
    RU: ["в", "Ключ в сумке."],
    ES: ["en", "La llave está en la bolsa."],
    FR: ["dans", "La clé est dans le sac."],
  },
  core3000_0008: {
    RU: ["иметь; иметься", "У меня есть телефон."],
    ES: ["tener", "Tengo un teléfono."],
    FR: ["avoir", "J'ai un téléphone."],
  },
  core3000_0009: {
    RU: ["это; он; она; оно", "Это в сумке."],
    ES: ["eso; lo; la", "Está en la bolsa."],
    FR: ["il; elle; ce", "C'est dans le sac."],
  },
  core3000_0010: {
    RU: ["ты; вы", "Ты мой друг."],
    ES: ["tú; usted", "Tú eres mi amigo."],
    FR: ["tu; vous", "Tu es mon ami."],
  },
  core3000_0011: {
    RU: ["он", "Он в школе."],
    ES: ["él", "Él está en la escuela."],
    FR: ["il", "Il est à l'école."],
  },
  core3000_0012: {
    RU: ["для", "Этот подарок для тебя."],
    ES: ["para", "Este regalo es para ti."],
    FR: ["pour", "Ce cadeau est pour toi."],
  },
  core3000_0013: {
    RU: ["они", "Они дома."],
    ES: ["ellos; ellas", "Ellos están en casa."],
    FR: ["ils; elles", "Ils sont à la maison."],
  },
  core3000_0014: {
    RU: ["не", "Я не устал."],
    ES: ["no", "No estoy cansado."],
    FR: ["ne... pas", "Je ne suis pas fatigué."],
  },
  core3000_0015: {
    RU: ["тот; та; то", "Та книга моя."],
    ES: ["ese; esa; aquel", "Ese libro es mío."],
    FR: ["ce; cette", "Ce livre est à moi."],
  },
  core3000_0016: {
    RU: ["мы", "Мы готовы."],
    ES: ["nosotros; nosotras", "Estamos listos."],
    FR: ["nous", "Nous sommes prêts."],
  },
  core3000_0017: {
    RU: ["на", "Чашка на столе."],
    ES: ["sobre; en", "La taza está sobre la mesa."],
    FR: ["sur", "La tasse est sur la table."],
  },
  core3000_0018: {
    RU: ["с", "Я со своей семьёй."],
    ES: ["con", "Estoy con mi familia."],
    FR: ["avec", "Je suis avec ma famille."],
  },
  core3000_0019: {
    RU: ["этот; эта; это", "Эта книга новая."],
    ES: ["este; esta", "Este libro es nuevo."],
    FR: ["ce; cette", "Ce livre est nouveau."],
  },
  core3000_0020: {
    RU: ["я", "Я дома."],
    ES: ["yo", "Estoy en casa."],
    FR: ["je", "Je suis à la maison."],
  },
  core3000_0021: {
    RU: ["делать", "Я делаю домашнее задание."],
    ES: ["hacer", "Hago mi tarea."],
    FR: ["faire", "Je fais mes devoirs."],
  },
  core3000_0022: {
    RU: ["как", "Она работает как учитель."],
    ES: ["como", "Ella trabaja como profesora."],
    FR: ["comme", "Elle travaille comme enseignante."],
  },
  core3000_0023: {
    RU: ["в; у", "Встреть меня в школе."],
    ES: ["en; a", "Queda conmigo en la escuela."],
    FR: ["à", "Retrouve-moi à l'école."],
  },
  core3000_0024: {
    RU: ["она", "Она моя сестра."],
    ES: ["ella", "Ella es mi hermana."],
    FR: ["elle", "Elle est ma sœur."],
  },
  core3000_0025: {
    RU: ["но", "Я устал, но счастлив."],
    ES: ["pero", "Estoy cansado, pero feliz."],
    FR: ["mais", "Je suis fatigué, mais heureux."],
  },
  core3000_0026: {
    RU: ["из; от", "Я из Канады."],
    ES: ["de; desde", "Soy de Canadá."],
    FR: ["de", "Je viens du Canada."],
  },
  core3000_0027: {
    RU: ["у; рядом с", "Сумка у двери."],
    ES: ["junto a; por", "La bolsa está junto a la puerta."],
    FR: ["près de; par", "Le sac est près de la porte."],
  },
  core3000_0028: {
    RU: ["буду; будет", "Я позвоню тебе."],
    ES: ["futuro con -é/-á", "Te llamaré."],
    FR: ["futur avec -rai", "Je t'appellerai."],
  },
  core3000_0029: {
    RU: ["или", "Чай или кофе подойдёт."],
    ES: ["o", "Té o café, cualquiera está bien."],
    FR: ["ou", "Du thé ou du café, c'est bien."],
  },
  core3000_0030: {
    RU: ["сказать; назвать", "Пожалуйста, назови своё имя."],
    ES: ["decir", "Por favor, di tu nombre."],
    FR: ["dire", "Dis ton nom, s'il te plaît."],
  },
  core3000_0031: {
    RU: ["идти; ехать", "Я иду домой после школы."],
    ES: ["ir", "Voy a casa después de la escuela."],
    FR: ["aller", "Je rentre à la maison après l'école."],
  },
  core3000_0032: {
    RU: ["поэтому; так что", "Уже поздно, поэтому я иду домой."],
    ES: ["así que", "Es tarde, así que me voy a casa."],
    FR: ["donc", "Il est tard, donc je rentre à la maison."],
  },
  core3000_0033: {
    RU: ["все", "Все ученики здесь."],
    ES: ["todo; todos", "Todos los estudiantes están aquí."],
    FR: ["tout; tous", "Tous les élèves sont ici."],
  },
  core3000_0034: {
    RU: ["там", "Положи сумку туда."],
    ES: ["allí", "Pon la bolsa allí."],
    FR: ["là", "Mets le sac là."],
  },
  core3000_0035: {
    RU: ["знать", "Я знаю ответ."],
    ES: ["saber; conocer", "Sé la respuesta."],
    FR: ["savoir; connaître", "Je connais la réponse."],
  },
  core3000_0036: {
    RU: ["получить", "Сегодня я получу новую книгу."],
    ES: ["recibir; conseguir", "Hoy recibo un libro nuevo."],
    FR: ["recevoir; obtenir", "Je reçois un nouveau livre aujourd'hui."],
  },
  core3000_0037: {
    RU: ["думать", "Я думаю, что это правильно."],
    ES: ["pensar", "Creo que esto es correcto."],
    FR: ["penser", "Je pense que c'est correct."],
  },
  core3000_0038: {
    RU: ["делать; готовить", "Я готовлю обед дома."],
    ES: ["hacer; preparar", "Preparo el almuerzo en casa."],
    FR: ["faire; préparer", "Je prépare le déjeuner à la maison."],
  },
  core3000_0039: {
    RU: ["время", "Время важно."],
    ES: ["el tiempo", "El tiempo es importante."],
    FR: ["le temps", "Le temps est important."],
  },
  core3000_0040: {
    RU: ["видеть", "Я вижу дом."],
    ES: ["ver", "Veo la casa."],
    FR: ["voir", "Je vois la maison."],
  },
  core3000_0041: {
    RU: ["наружу; вне", "Пожалуйста, выйди сейчас."],
    ES: ["fuera", "Por favor, sal ahora."],
    FR: ["dehors", "Sors maintenant, s'il te plaît."],
  },
  core3000_0042: {
    RU: ["хороший", "Это хороший день."],
    ES: ["bueno", "Es un buen día."],
    FR: ["bon", "C'est une bonne journée."],
  },
  core3000_0043: {
    RU: ["люди", "Здесь много людей."],
    ES: ["la gente; las personas", "Hay muchas personas aquí."],
    FR: ["les gens; les personnes", "Il y a beaucoup de gens ici."],
  },
  core3000_0044: {
    RU: ["год", "В году двенадцать месяцев."],
    ES: ["el año", "Un año tiene doce meses."],
    FR: ["l'année", "Une année a douze mois."],
  },
  core3000_0045: {
    RU: ["взять", "Пожалуйста, возьми эту сумку."],
    ES: ["tomar; coger", "Por favor, toma esta bolsa."],
    FR: ["prendre", "Prends ce sac, s'il te plaît."],
  },
  core3000_0046: {
    RU: ["хорошо", "Она хорошо читает."],
    ES: ["bien", "Ella lee bien."],
    FR: ["bien", "Elle lit bien."],
  },
  core3000_0047: {
    RU: ["очень", "Эта комната очень маленькая."],
    ES: ["muy", "Esta habitación es muy pequeña."],
    FR: ["très", "Cette pièce est très petite."],
  },
  core3000_0048: {
    RU: ["только; просто", "Мне просто нужна вода."],
    ES: ["solo; justo", "Solo necesito agua."],
    FR: ["seulement; juste", "J'ai juste besoin d'eau."],
  },
  core3000_0049: {
    RU: ["приходить", "Пожалуйста, иди сюда."],
    ES: ["venir", "Por favor, ven aquí."],
    FR: ["venir", "Viens ici, s'il te plaît."],
  },
  core3000_0050: {
    RU: ["работать", "Я работаю в школе."],
    ES: ["trabajar", "Trabajo en una escuela."],
    FR: ["travailler", "Je travaille dans une école."],
  },
  core3000_0051: {
    RU: ["использовать; пользоваться", "Я пользуюсь этим телефоном каждый день."],
    ES: ["usar", "Uso este teléfono todos los días."],
    FR: ["utiliser", "J'utilise ce téléphone tous les jours."],
  },
  core3000_0052: {
    RU: ["затем; тогда", "Позавтракай, затем иди в школу."],
    ES: ["luego; entonces", "Desayuna, luego ve a la escuela."],
    FR: ["puis; alors", "Prends le petit déjeuner, puis va à l'école."],
  },
  core3000_0053: {
    RU: ["также; тоже", "Я также говорю по-английски."],
    ES: ["también", "También hablo inglés."],
    FR: ["aussi", "Je parle aussi anglais."],
  },
  core3000_0054: {
    RU: ["только", "У меня только одна ручка."],
    ES: ["solo", "Solo tengo un bolígrafo."],
    FR: ["seulement", "Je n'ai qu'un stylo."],
  },
  core3000_0055: {
    RU: ["смотреть", "Посмотри на доску."],
    ES: ["mirar", "Mira la pizarra."],
    FR: ["regarder", "Regarde le tableau."],
  },
  core3000_0056: {
    RU: ["хотеть", "Я хочу новую книгу."],
    ES: ["querer", "Quiero un libro nuevo."],
    FR: ["vouloir", "Je veux un nouveau livre."],
  },
  core3000_0057: {
    RU: ["дать", "Пожалуйста, дай мне ручку."],
    ES: ["dar", "Por favor, dame el bolígrafo."],
    FR: ["donner", "Donne-moi le stylo, s'il te plaît."],
  },
  core3000_0058: {
    RU: ["первый", "Это мой первый день."],
    ES: ["primero", "Es mi primer día."],
    FR: ["premier", "C'est mon premier jour."],
  },
  core3000_0059: {
    RU: ["новый", "У меня новый телефон."],
    ES: ["nuevo", "Tengo un teléfono nuevo."],
    FR: ["nouveau", "J'ai un nouveau téléphone."],
  },
  core3000_0060: {
    RU: ["способ; путь", "Это хороший способ учиться."],
    ES: ["la forma; el camino", "Es una buena forma de aprender."],
    FR: ["la façon; le chemin", "C'est une bonne façon d'apprendre."],
  },
  core3000_0061: {
    RU: ["найти", "Я нахожу ключи на столе."],
    ES: ["encontrar", "Encuentro mis llaves en la mesa."],
    FR: ["trouver", "Je trouve mes clés sur la table."],
  },
  core3000_0062: {
    RU: ["день", "День может быть очень загруженным."],
    ES: ["el día", "Un día puede ser muy ajetreado."],
    FR: ["le jour", "Une journée peut être très chargée."],
  },
  core3000_0063: {
    RU: ["вещь", "Эта вещь полезная."],
    ES: ["la cosa", "Esta cosa es útil."],
    FR: ["la chose", "Cette chose est utile."],
  },
  core3000_0064: {
    RU: ["правильный", "Твой ответ правильный."],
    ES: ["correcto", "Tu respuesta es correcta."],
    FR: ["correct", "Ta réponse est correcte."],
  },
  core3000_0065: {
    RU: ["как", "Как пишется твоё имя?"],
    ES: ["cómo", "¿Cómo se escribe tu nombre?"],
    FR: ["comment", "Comment épelles-tu ton nom ?"],
  },
  core3000_0066: {
    RU: ["назад; обратно", "Пожалуйста, скоро возвращайся."],
    ES: ["de vuelta", "Por favor, vuelve pronto."],
    FR: ["de retour", "Reviens bientôt, s'il te plaît."],
  },
  core3000_0067: {
    RU: ["значить", "Что значит это слово?"],
    ES: ["significar", "¿Qué significa esta palabra?"],
    FR: ["signifier", "Que signifie ce mot ?"],
  },
  core3000_0068: {
    RU: ["даже", "Даже ребёнок может это сделать."],
    ES: ["incluso", "Incluso un niño puede hacer esto."],
    FR: ["même", "Même un enfant peut faire cela."],
  },
  core3000_0069: {
    RU: ["здесь", "Пожалуйста, сядь здесь."],
    ES: ["aquí", "Por favor, siéntate aquí."],
    FR: ["ici", "Assieds-toi ici, s'il te plaît."],
  },
  core3000_0070: {
    RU: ["ребёнок", "Ребёнок играет на улице."],
    ES: ["el niño; la niña", "Un niño juega afuera."],
    FR: ["l'enfant", "Un enfant joue dehors."],
  },
  core3000_0071: {
    RU: ["сказать; рассказать", "Пожалуйста, скажи мне своё имя."],
    ES: ["decir; contar", "Por favor, dime tu nombre."],
    FR: ["dire; raconter", "Dis-moi ton nom, s'il te plaît."],
  },
  core3000_0072: {
    RU: ["действительно; очень", "Мне действительно нравится эта книга."],
    ES: ["realmente", "Realmente me gusta este libro."],
    FR: ["vraiment", "J'aime vraiment ce livre."],
  },
  core3000_0073: {
    RU: ["звонить; называть", "Я звоню маме каждый день."],
    ES: ["llamar", "Llamo a mi madre todos los días."],
    FR: ["appeler", "J'appelle ma mère tous les jours."],
  },
  core3000_0074: {
    RU: ["компания", "Компания продаёт эти телефоны."],
    ES: ["la empresa", "Una empresa vende estos teléfonos."],
    FR: ["l'entreprise", "Une entreprise vend ces téléphones."],
  },
  core3000_0075: {
    RU: ["показать", "Пожалуйста, покажи мне карту."],
    ES: ["mostrar", "Por favor, muéstrame el mapa."],
    FR: ["montrer", "Montre-moi la carte, s'il te plaît."],
  },
  core3000_0076: {
    RU: ["жизнь", "Жизнь здесь другая."],
    ES: ["la vida", "La vida es diferente aquí."],
    FR: ["la vie", "La vie est différente ici."],
  },
  core3000_0077: {
    RU: ["мужчина", "Мужчина ждёт снаружи."],
    ES: ["el hombre", "Un hombre espera afuera."],
    FR: ["l'homme", "Un homme attend dehors."],
  },
  core3000_0078: {
    RU: ["меняться; менять", "Планы быстро меняются."],
    ES: ["cambiar", "Los planes cambian rápidamente."],
    FR: ["changer", "Les plans changent rapidement."],
  },
  core3000_0079: {
    RU: ["место", "Это место тихое."],
    ES: ["el lugar", "Este lugar es tranquilo."],
    FR: ["le lieu; l'endroit", "Cet endroit est calme."],
  },
  core3000_0080: {
    RU: ["длинный; долгий", "Это длинная дорога."],
    ES: ["largo", "Es un camino largo."],
    FR: ["long", "C'est une longue route."],
  },
  core3000_0081: {
    RU: ["чувствовать", "Сегодня я чувствую себя счастливым."],
    ES: ["sentir", "Hoy me siento feliz."],
    FR: ["sentir", "Je me sens heureux aujourd'hui."],
  },
  core3000_0082: {
    RU: ["слишком", "Эта сумка слишком тяжёлая."],
    ES: ["demasiado", "Esta bolsa es demasiado pesada."],
    FR: ["trop", "Ce sac est trop lourd."],
  },
  core3000_0083: {
    RU: ["всё ещё", "Я всё ещё живу здесь."],
    ES: ["todavía", "Todavía vivo aquí."],
    FR: ["encore", "J'habite encore ici."],
  },
  core3000_0084: {
    RU: ["проблема", "Это небольшая проблема."],
    ES: ["el problema", "Es un pequeño problema."],
    FR: ["le problème", "C'est un petit problème."],
  },
  core3000_0085: {
    RU: ["писать", "Пожалуйста, напиши своё имя."],
    ES: ["escribir", "Por favor, escribe tu nombre."],
    FR: ["écrire", "Écris ton nom, s'il te plaît."],
  },
  core3000_0086: {
    RU: ["отличный; великий", "Это отличная идея."],
    ES: ["genial; grande", "Es una idea genial."],
    FR: ["excellent; grand", "C'est une excellente idée."],
  },
  core3000_0087: {
    RU: ["пытаться; стараться", "Я стараюсь учиться каждый день."],
    ES: ["intentar", "Intento aprender todos los días."],
    FR: ["essayer", "J'essaie d'apprendre tous les jours."],
  },
  core3000_0088: {
    RU: ["уходить", "Мы уходим в восемь."],
    ES: ["salir; irse", "Nos vamos a las ocho."],
    FR: ["partir; quitter", "Nous partons à huit heures."],
  },
  core3000_0089: {
    RU: ["число; номер", "Напиши число здесь."],
    ES: ["el número", "Escribe el número aquí."],
    FR: ["le nombre; le numéro", "Écris le nombre ici."],
  },
  core3000_0090: {
    RU: ["часть", "Эта часть важна."],
    ES: ["la parte", "Esta parte es importante."],
    FR: ["la partie", "Cette partie est importante."],
  },
  core3000_0091: {
    RU: ["пункт; точка", "Этот пункт понятен."],
    ES: ["el punto", "Este punto está claro."],
    FR: ["le point", "Ce point est clair."],
  },
  core3000_0092: {
    RU: ["помогать", "Я помогаю своему другу."],
    ES: ["ayudar", "Ayudo a mi amigo."],
    FR: ["aider", "J'aide mon ami."],
  },
  core3000_0093: {
    RU: ["спрашивать", "Пожалуйста, задай вопрос."],
    ES: ["preguntar; pedir", "Por favor, haz una pregunta."],
    FR: ["demander", "Pose une question, s'il te plaît."],
  },
  core3000_0094: {
    RU: ["встречаться", "Мы встречаемся в школе."],
    ES: ["encontrarse; conocer", "Nos encontramos en la escuela."],
    FR: ["rencontrer; se retrouver", "Nous nous retrouvons à l'école."],
  },
  core3000_0095: {
    RU: ["начинать", "Занятия начинаются в девять."],
    ES: ["empezar; comenzar", "Las clases empiezan a las nueve."],
    FR: ["commencer", "Les cours commencent à neuf heures."],
  },
  core3000_0096: {
    RU: ["говорить; разговаривать", "Я разговариваю со своим учителем."],
    ES: ["hablar", "Hablo con mi profesor."],
    FR: ["parler", "Je parle avec mon professeur."],
  },
  core3000_0097: {
    RU: ["класть; положить", "Положи книгу на стол."],
    ES: ["poner", "Pon el libro sobre la mesa."],
    FR: ["mettre", "Mets le livre sur la table."],
  },
  core3000_0098: {
    RU: ["становиться", "Я хочу стать учителем."],
    ES: ["ser; convertirse en", "Quiero ser profesor."],
    FR: ["devenir", "Je veux devenir professeur."],
  },
  core3000_0099: {
    RU: ["интерес", "Она проявляет интерес к музыке."],
    ES: ["el interés", "Ella muestra interés por la música."],
    FR: ["l'intérêt", "Elle montre de l'intérêt pour la musique."],
  },
  core3000_0100: {
    RU: ["страна", "Канада — большая страна."],
    ES: ["el país", "Canadá es un país grande."],
    FR: ["le pays", "Le Canada est un grand pays."],
  },
  core3000_0101: {
    RU: ["старый", "Это старый дом."],
    ES: ["viejo; antiguo", "Es una casa antigua."],
    FR: ["vieux; ancien", "C'est une vieille maison."],
  },
  core3000_0102: {
    RU: ["школа", "Школа рядом с моим домом."],
    ES: ["la escuela", "Hay una escuela cerca de mi casa."],
    FR: ["l'école", "Il y a une école près de chez moi."],
  },
  core3000_0103: {
    RU: ["поздний; опоздавший", "Я опаздываю на занятие."],
    ES: ["tarde", "Llego tarde a clase."],
    FR: ["en retard; tard", "Je suis en retard pour le cours."],
  },
  core3000_0104: {
    RU: ["высокий", "Стена высокая."],
    ES: ["alto", "La pared es alta."],
    FR: ["haut", "Le mur est haut."],
  },
  core3000_0105: {
    RU: ["разный; другой", "Эти две книги разные."],
    ES: ["diferente", "Estos dos libros son diferentes."],
    FR: ["différent", "Ces deux livres sont différents."],
  },
  core3000_0106: {
    RU: ["конец", "Конец истории грустный."],
    ES: ["el final", "El final de la historia es triste."],
    FR: ["la fin", "La fin de l'histoire est triste."],
  },
  core3000_0107: {
    RU: ["жить", "Я живу в маленьком городе."],
    ES: ["vivir", "Vivo en una ciudad pequeña."],
    FR: ["vivre", "Je vis dans une petite ville."],
  },
  core3000_0108: {
    RU: ["почему", "Почему ты здесь?"],
    ES: ["por qué", "¿Por qué estás aquí?"],
    FR: ["pourquoi", "Pourquoi es-tu ici ?"],
  },
  core3000_0109: {
    RU: ["мир", "Люди живут по всему миру."],
    ES: ["el mundo", "La gente vive en todo el mundo."],
    FR: ["le monde", "Les gens vivent partout dans le monde."],
  },
  core3000_0110: {
    RU: ["неделя", "В неделе семь дней."],
    ES: ["la semana", "Una semana tiene siete días."],
    FR: ["la semaine", "Une semaine a sept jours."],
  },
  core3000_0111: {
    RU: ["играть", "Дети играют в парке."],
    ES: ["jugar; tocar", "Los niños juegan en el parque."],
    FR: ["jouer", "Les enfants jouent dans le parc."],
  },
  core3000_0112: {
    RU: ["домой; дома", "Я иду домой после работы."],
    ES: ["a casa; en casa", "Voy a casa después del trabajo."],
    FR: ["à la maison", "Je rentre à la maison après le travail."],
  },
  core3000_0113: {
    RU: ["никогда", "Я никогда не ем мясо."],
    ES: ["nunca", "Nunca como carne."],
    FR: ["jamais", "Je ne mange jamais de viande."],
  },
  core3000_0114: {
    RU: ["включать; входить", "В эту цену может входить завтрак."],
    ES: ["incluir", "Este precio puede incluir el desayuno."],
    FR: ["inclure", "Ce prix peut inclure le petit déjeuner."],
  },
  core3000_0115: {
    RU: ["курс", "Этот курс начинается сегодня."],
    ES: ["el curso", "Este curso empieza hoy."],
    FR: ["le cours", "Ce cours commence aujourd'hui."],
  },
  core3000_0116: {
    RU: ["дом", "Дом находится рядом со школой."],
    ES: ["la casa", "Hay una casa cerca de la escuela."],
    FR: ["la maison", "Il y a une maison près de l'école."],
  },
  core3000_0117: {
    RU: ["отчёт; доклад", "Отчёт короткий."],
    ES: ["el informe", "El informe es corto."],
    FR: ["le rapport", "Le rapport est court."],
  },
  core3000_0118: {
    RU: ["группа", "Группа студентов ждёт."],
    ES: ["el grupo", "Un grupo de estudiantes espera."],
    FR: ["le groupe", "Un groupe d'étudiants attend."],
  },
  core3000_0119: {
    RU: ["случай; дело", "Этот случай другой."],
    ES: ["el caso", "Este caso es diferente."],
    FR: ["le cas", "Ce cas est différent."],
  },
  core3000_0120: {
    RU: ["женщина", "Женщина ждёт снаружи."],
    ES: ["la mujer", "Una mujer espera afuera."],
    FR: ["la femme", "Une femme attend dehors."],
  },
  core3000_0121: {
    RU: ["книга", "Эта книга новая."],
    ES: ["el libro", "Este libro es nuevo."],
    FR: ["le livre", "Ce livre est nouveau."],
  },
  core3000_0122: {
    RU: ["семья", "Моя семья дома."],
    ES: ["la familia", "Mi familia está en casa."],
    FR: ["la famille", "Ma famille est à la maison."],
  },
  core3000_0123: {
    RU: ["казаться", "Ты кажешься уставшим."],
    ES: ["parecer", "Pareces cansado."],
    FR: ["sembler", "Tu sembles fatigué."],
  },
  core3000_0124: {
    RU: ["позволять", "Пожалуйста, позволь мне помочь."],
    ES: ["dejar; permitir", "Por favor, déjame ayudar."],
    FR: ["laisser; permettre", "Laisse-moi t'aider, s'il te plaît."],
  },
  core3000_0125: {
    RU: ["снова", "Пожалуйста, скажи это снова."],
    ES: ["otra vez", "Por favor, dilo otra vez."],
    FR: ["encore", "Dis-le encore, s'il te plaît."],
  },
  core3000_0126: {
    RU: ["вид; сорт", "Этот сорт чая хороший."],
    ES: ["el tipo; la clase", "Este tipo de té es bueno."],
    FR: ["le type; la sorte", "Cette sorte de thé est bonne."],
  },
  core3000_0127: {
    RU: ["держать; оставлять", "Оставь телефон здесь."],
    ES: ["guardar; mantener", "Guarda tu teléfono aquí."],
    FR: ["garder", "Garde ton téléphone ici."],
  },
  core3000_0128: {
    RU: ["слышать", "Я слышу музыку снаружи."],
    ES: ["oír; escuchar", "Oigo música afuera."],
    FR: ["entendre", "J'entends de la musique dehors."],
  },
  core3000_0129: {
    RU: ["система", "Эта система простая."],
    ES: ["el sistema", "Este sistema es simple."],
    FR: ["le système", "Ce système est simple."],
  },
  core3000_0130: {
    RU: ["вопрос", "Задай вопрос сейчас."],
    ES: ["la pregunta", "Haz una pregunta ahora."],
    FR: ["la question", "Pose une question maintenant."],
  },
  core3000_0131: {
    RU: ["всегда", "Она всегда приходит рано."],
    ES: ["siempre", "Ella siempre llega temprano."],
    FR: ["toujours", "Elle arrive toujours tôt."],
  },
  core3000_0132: {
    RU: ["большой", "Это большая комната."],
    ES: ["grande", "Es una habitación grande."],
    FR: ["grand", "C'est une grande pièce."],
  },
  core3000_0133: {
    RU: ["набор; комплект", "В этом наборе шесть чашек."],
    ES: ["el conjunto; el juego", "Este conjunto tiene seis tazas."],
    FR: ["l'ensemble; le jeu", "Cet ensemble contient six tasses."],
  },
  core3000_0134: {
    RU: ["маленький", "Это маленькая комната."],
    ES: ["pequeño", "Es una habitación pequeña."],
    FR: ["petit", "C'est une petite pièce."],
  },
  core3000_0135: {
    RU: ["изучать", "Я изучаю английский каждый день."],
    ES: ["estudiar", "Estudio inglés todos los días."],
    FR: ["étudier", "J'étudie l'anglais tous les jours."],
  },
  core3000_0136: {
    RU: ["следовать", "Пожалуйста, следуй за учителем."],
    ES: ["seguir", "Por favor, sigue al profesor."],
    FR: ["suivre", "Suis le professeur, s'il te plaît."],
  },
  core3000_0137: {
    RU: ["начинать", "Занятие может начаться сейчас."],
    ES: ["empezar; comenzar", "La clase puede empezar ahora."],
    FR: ["commencer", "Le cours peut commencer maintenant."],
  },
  core3000_0138: {
    RU: ["важный", "Этот вопрос важен."],
    ES: ["importante", "Esta pregunta es importante."],
    FR: ["important", "Cette question est importante."],
  },
  core3000_0139: {
    RU: ["бегать; бежать", "Я бегаю в парке."],
    ES: ["correr", "Corro en el parque."],
    FR: ["courir", "Je cours dans le parc."],
  },
  core3000_0140: {
    RU: ["поворачивать", "Поверни налево у двери."],
    ES: ["girar", "Gira a la izquierda al llegar a la puerta."],
    FR: ["tourner", "Tourne à gauche à la porte."],
  },
  core3000_0141: {
    RU: ["принести", "Пожалуйста, принеси свою книгу."],
    ES: ["traer", "Por favor, trae tu libro."],
    FR: ["apporter", "Apporte ton livre, s'il te plaît."],
  },
  core3000_0142: {
    RU: ["ранний; рано", "Нам нужно начать рано."],
    ES: ["temprano", "Tenemos que empezar temprano."],
    FR: ["tôt; précoce", "Nous devons commencer tôt."],
  },
  core3000_0143: {
    RU: ["рука; кисть", "Подними руку."],
    ES: ["la mano", "Levanta la mano."],
    FR: ["la main", "Lève la main."],
  },
  core3000_0144: {
    RU: ["штат", "Калифорния — большой штат."],
    ES: ["el estado", "California es un estado grande."],
    FR: ["l'État", "La Californie est un grand État."],
  },
  core3000_0145: {
    RU: ["двигать; двигаться", "Пожалуйста, подвинь стул."],
    ES: ["mover", "Por favor, mueve la silla."],
    FR: ["déplacer; bouger", "Déplace la chaise, s'il te plaît."],
  },
  core3000_0146: {
    RU: ["деньги", "Мне нужны деньги на обед."],
    ES: ["el dinero", "Necesito dinero para el almuerzo."],
    FR: ["l'argent", "J'ai besoin d'argent pour le déjeuner."],
  },
  core3000_0147: {
    RU: ["факт", "Этот факт важен."],
    ES: ["el hecho", "Este hecho es importante."],
    FR: ["le fait", "Ce fait est important."],
  },
  core3000_0148: {
    RU: ["однако", "Уже поздно, однако мы можем подождать."],
    ES: ["sin embargo", "Es tarde; sin embargo, podemos esperar."],
    FR: ["cependant", "Il est tard ; cependant, nous pouvons attendre."],
  },
  core3000_0149: {
    RU: ["область; зона", "Эта зона тихая."],
    ES: ["el área; la zona", "Esta zona es tranquila."],
    FR: ["la zone; le domaine", "Cette zone est calme."],
  },
  core3000_0150: {
    RU: ["предоставлять", "Школа может предоставить обед."],
    ES: ["proporcionar", "La escuela puede proporcionar el almuerzo."],
    FR: ["fournir", "L'école peut fournir le déjeuner."],
  },
};

const languages = ["RU", "ES", "FR"];

function normalizeText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
}

async function readJsonl(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

const sourceRows = await readJsonl(inputPath);
const outputRows = sourceRows.map((row) => {
  const localized = translations[row.core_item_id];
  if (!localized) throw new Error(`Missing RU/ES/FR translation for ${row.core_item_id}.`);
  const out = {
    release_id: releaseId,
    course_id: row.course_id,
    row_id: row.row_id,
    core_item_id: row.core_item_id,
    meaning_id: row.meaning_id,
    source_headword: row.source_headword,
    part_of_speech: row.part_of_speech,
    en_display: row.en_display,
    example_EN: row.example_EN,
    translation_batch: "ru_es_fr_v0",
    translation_status: "draft_native_style_qa_v2_checked",
    source_note: "Internal LunaCards draft translation layer; native-style QA v2 checked, final QA and source-assisted checks still required before delivery.",
  };
  for (const language of languages) {
    const [display, example] = localized[language] ?? [];
    out[language] = normalizeText(display);
    out[`example_${language}`] = normalizeText(example);
  }
  return out;
});

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `${releaseId}_translation_batch_ru_es_fr_v0.jsonl`);
await writeJsonl(outputPath, outputRows);

const summaryPath = path.join(outputDir, `${releaseId}_translation_batch_ru_es_fr_v0_summary.md`);
await fs.writeFile(
  summaryPath,
  [
    `# Translation Batch RU/ES/FR v0: ${releaseId}`,
    "",
    `- Rows: ${outputRows.length}`,
    "- Languages: RU, ES, FR",
    "- Fields: display word plus translated example only",
    "- Target-language transcription fields: not generated",
    "- Status: draft_native_style_qa_v2_checked",
    "",
    "This artifact does not import Postgres rows and does not create a Google Sheet.",
    "Function words may use learner-facing glosses where a direct one-word target equivalent is misleading.",
    "Language QA v1 and native-style QA v2 repaired confirmed naturalness/copy issues; final QA evidence is still not created.",
    "",
  ].join("\n"),
  "utf8"
);

console.log(
  `English Core 3000 RU/ES/FR translation batch written: ${path.relative(process.cwd(), outputPath)} rows=${outputRows.length}`
);
