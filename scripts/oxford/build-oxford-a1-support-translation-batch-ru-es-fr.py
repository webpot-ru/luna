#!/usr/bin/env python3
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_VERSION = "2026-05-17.v1"
LANGUAGES = ["RU", "ES", "FR"]
SENTENCE_END_RE = re.compile(r"[.!?。！？]$")


TRANSLATIONS = {
    "a, an": {
        "RU": ["неопределённый артикль", "У меня есть ручка."],
        "ES": ["un; una", "Tengo un bolígrafo."],
        "FR": ["un; une", "J'ai un stylo."],
    },
    "about": {
        "RU": ["о; примерно", "Мы говорим о еде."],
        "ES": ["sobre; aproximadamente", "Hablamos sobre comida."],
        "FR": ["sur; environ", "Nous parlons de nourriture."],
    },
    "above": {
        "RU": ["над; выше", "Часы находятся над дверью."],
        "ES": ["encima de; por encima de", "El reloj está encima de la puerta."],
        "FR": ["au-dessus de", "L'horloge est au-dessus de la porte."],
    },
    "across": {
        "RU": ["через; напротив", "Магазин находится через улицу."],
        "ES": ["al otro lado de", "La tienda está al otro lado de la calle."],
        "FR": ["de l'autre côté de", "Le magasin est de l'autre côté de la rue."],
    },
    "action": {
        "RU": ["действие", "Его действие помогает мне."],
        "ES": ["acción", "Su acción me ayuda."],
        "FR": ["action", "Son action m'aide."],
    },
    "activity": {
        "RU": ["занятие; деятельность", "Плавание — весёлое занятие."],
        "ES": ["actividad", "Nadar es una actividad divertida."],
        "FR": ["activité", "La natation est une activité amusante."],
    },
    "actor": {
        "RU": ["актёр", "Актёр снимается в фильме."],
        "ES": ["actor", "El actor está en una película."],
        "FR": ["acteur", "L'acteur est dans un film."],
    },
    "actress": {
        "RU": ["актриса", "Актриса улыбается нам."],
        "ES": ["actriz", "La actriz nos sonríe."],
        "FR": ["actrice", "L'actrice nous sourit."],
    },
    "add": {
        "RU": ["добавить", "Добавьте здесь своё имя."],
        "ES": ["añadir; agregar", "Añade tu nombre aquí."],
        "FR": ["ajouter", "Ajoute ton nom ici."],
    },
    "address": {
        "RU": ["адрес", "Мой адрес на этой карточке."],
        "ES": ["dirección", "Mi dirección está en esta tarjeta."],
        "FR": ["adresse", "Mon adresse est sur cette carte."],
    },
    "adult": {
        "RU": ["взрослый", "Взрослый сидит у двери."],
        "ES": ["adulto", "Un adulto se sienta cerca de la puerta."],
        "FR": ["adulte", "Un adulte est assis près de la porte."],
    },
    "advice": {
        "RU": ["совет", "Её совет простой."],
        "ES": ["consejo", "Su consejo es simple."],
        "FR": ["conseil", "Son conseil est simple."],
    },
    "afraid": {
        "RU": ["испуганный; бояться", "Ребёнок боится."],
        "ES": ["asustado; tener miedo", "El niño tiene miedo."],
        "FR": ["avoir peur; effrayé", "L'enfant a peur."],
    },
    "after": {
        "RU": ["после", "Я ем после урока."],
        "ES": ["después de", "Como después de clase."],
        "FR": ["après", "Je mange après le cours."],
    },
    "afternoon": {
        "RU": ["день; после полудня", "Я учусь днём."],
        "ES": ["tarde", "Estudio por la tarde."],
        "FR": ["après-midi", "J'étudie l'après-midi."],
    },
    "again": {
        "RU": ["снова; опять", "Пожалуйста, скажите это снова."],
        "ES": ["otra vez", "Por favor, dilo otra vez."],
        "FR": ["encore; de nouveau", "Dis-le encore, s'il te plaît."],
    },
    "age": {
        "RU": ["возраст", "Какой у вас возраст?"],
        "ES": ["edad", "¿Cuál es tu edad?"],
        "FR": ["âge", "Quel âge as-tu ?"],
    },
    "ago": {
        "RU": ["назад", "Я пришёл сюда два дня назад."],
        "ES": ["hace", "Vine aquí hace dos días."],
        "FR": ["il y a", "Je suis venu ici il y a deux jours."],
    },
    "agree": {
        "RU": ["соглашаться", "Я согласен с тобой."],
        "ES": ["estar de acuerdo", "Estoy de acuerdo contigo."],
        "FR": ["être d'accord", "Je suis d'accord avec toi."],
    },
    "air": {
        "RU": ["воздух", "Воздух холодный."],
        "ES": ["aire", "El aire está frío."],
        "FR": ["air", "L'air est froid."],
    },
    "airport": {
        "RU": ["аэропорт", "Мы в аэропорту."],
        "ES": ["aeropuerto", "Estamos en el aeropuerto."],
        "FR": ["aéroport", "Nous sommes à l'aéroport."],
    },
    "all": {
        "RU": ["все; весь", "Все ученики здесь."],
        "ES": ["todo; todos", "Todos los estudiantes están aquí."],
        "FR": ["tout; tous", "Tous les élèves sont ici."],
    },
    "also": {
        "RU": ["тоже; также", "Я тоже люблю чай."],
        "ES": ["también", "También me gusta el té."],
        "FR": ["aussi", "J'aime aussi le thé."],
    },
    "always": {
        "RU": ["всегда", "Она всегда пьёт воду."],
        "ES": ["siempre", "Ella siempre bebe agua."],
        "FR": ["toujours", "Elle boit toujours de l'eau."],
    },
    "amazing": {
        "RU": ["удивительный", "Вид удивительный."],
        "ES": ["increíble", "La vista es increíble."],
        "FR": ["incroyable", "La vue est incroyable."],
    },
    "and": {
        "RU": ["и", "Том и Анна — друзья."],
        "ES": ["y", "Tom y Anna son amigos."],
        "FR": ["et", "Tom et Anna sont amis."],
    },
    "angry": {
        "RU": ["злой; сердитый", "Он сейчас злится."],
        "ES": ["enojado; enfadado", "Él está enfadado ahora."],
        "FR": ["en colère", "Il est en colère maintenant."],
    },
    "animal": {
        "RU": ["животное", "Собака — это животное."],
        "ES": ["animal", "Un perro es un animal."],
        "FR": ["animal", "Un chien est un animal."],
    },
    "another": {
        "RU": ["другой; ещё один", "Я хочу ещё одну чашку."],
        "ES": ["otro; otra", "Quiero otra taza."],
        "FR": ["un autre; une autre", "Je veux une autre tasse."],
    },
    "answer": {
        "RU": ["ответ", "Напишите ответ здесь."],
        "ES": ["respuesta", "Escribe la respuesta aquí."],
        "FR": ["réponse", "Écris la réponse ici."],
    },
    "any": {
        "RU": ["какой-нибудь; любой", "У тебя есть деньги?"],
        "ES": ["algún; cualquier", "¿Tienes dinero?"],
        "FR": ["du; de; n'importe quel", "As-tu de l'argent ?"],
    },
    "anyone": {
        "RU": ["кто-нибудь", "Кому-нибудь нужна помощь?"],
        "ES": ["alguien", "¿Alguien necesita ayuda?"],
        "FR": ["quelqu'un", "Quelqu'un a besoin d'aide ?"],
    },
    "anything": {
        "RU": ["что-нибудь; ничего", "Я ничего не вижу."],
        "ES": ["algo; nada", "No puedo ver nada."],
        "FR": ["quelque chose; rien", "Je ne vois rien."],
    },
    "apartment": {
        "RU": ["квартира", "Моя квартира маленькая."],
        "ES": ["apartamento; piso", "Mi apartamento es pequeño."],
        "FR": ["appartement", "Mon appartement est petit."],
    },
    "apple": {
        "RU": ["яблоко", "Это яблоко красное."],
        "ES": ["manzana", "Esta manzana es roja."],
        "FR": ["pomme", "Cette pomme est rouge."],
    },
    "April": {
        "RU": ["апрель", "Мой день рождения в апреле."],
        "ES": ["abril", "Mi cumpleaños es en abril."],
        "FR": ["avril", "Mon anniversaire est en avril."],
    },
    "area": {
        "RU": ["район; область", "Этот район тихий."],
        "ES": ["zona; área", "Esta zona es tranquila."],
        "FR": ["zone; quartier", "Cette zone est calme."],
    },
    "arm": {
        "RU": ["рука", "У меня болит рука."],
        "ES": ["brazo", "Me duele el brazo."],
        "FR": ["bras", "J'ai mal au bras."],
    },
    "around": {
        "RU": ["вокруг; около", "Мы гуляем вокруг парка."],
        "ES": ["alrededor de", "Caminamos alrededor del parque."],
        "FR": ["autour de", "Nous marchons autour du parc."],
    },
    "arrive": {
        "RU": ["прибывать; приходить", "Они приходят в шесть."],
        "ES": ["llegar", "Ellos llegan a las seis."],
        "FR": ["arriver", "Ils arrivent à six heures."],
    },
    "art": {
        "RU": ["искусство", "Мне нравится искусство."],
        "ES": ["arte", "Me gusta el arte."],
        "FR": ["art", "J'aime l'art."],
    },
    "article": {
        "RU": ["статья; артикль", "Я читаю статью онлайн."],
        "ES": ["artículo", "Leo un artículo en línea."],
        "FR": ["article", "Je lis un article en ligne."],
    },
    "artist": {
        "RU": ["художник; артист", "Художник рисует лицо."],
        "ES": ["artista", "El artista dibuja una cara."],
        "FR": ["artiste", "L'artiste dessine un visage."],
    },
    "as": {
        "RU": ["как; в качестве", "Я работаю учителем."],
        "ES": ["como", "Trabajo como profesor."],
        "FR": ["comme", "Je travaille comme professeur."],
    },
    "ask": {
        "RU": ["спрашивать; просить", "Спросите учителя сейчас."],
        "ES": ["preguntar; pedir", "Pregunta al profesor ahora."],
        "FR": ["demander", "Demande au professeur maintenant."],
    },
    "at": {
        "RU": ["в; у", "Я дома."],
        "ES": ["en; a", "Estoy en casa."],
        "FR": ["à; chez", "Je suis à la maison."],
    },
    "August": {
        "RU": ["август", "Мы путешествуем в августе."],
        "ES": ["agosto", "Viajamos en agosto."],
        "FR": ["août", "Nous voyageons en août."],
    },
    "aunt": {
        "RU": ["тётя", "Моя тётя живёт здесь."],
        "ES": ["tía", "Mi tía vive aquí."],
        "FR": ["tante", "Ma tante vit ici."],
    },
    "autumn": {
        "RU": ["осень", "Листья падают осенью."],
        "ES": ["otoño", "Las hojas caen en otoño."],
        "FR": ["automne", "Les feuilles tombent en automne."],
    },
    "away": {
        "RU": ["прочь; вдали", "Автобус уезжает."],
        "ES": ["lejos; fuera", "El autobús se va."],
        "FR": ["loin; ailleurs", "Le bus s'en va."],
    },
    "baby": {
        "RU": ["младенец; ребёнок", "Малыш спит."],
        "ES": ["bebé", "El bebé está durmiendo."],
        "FR": ["bébé", "Le bébé dort."],
    },
    "back": {
        "RU": ["спина; назад", "У меня болит спина."],
        "ES": ["espalda; atrás", "Me duele la espalda."],
        "FR": ["dos; arrière", "J'ai mal au dos."],
    },
    "bad": {
        "RU": ["плохой", "Это молоко плохое."],
        "ES": ["malo", "Esta leche está mala."],
        "FR": ["mauvais", "Ce lait est mauvais."],
    },
    "bag": {
        "RU": ["сумка", "Твоя сумка на стуле."],
        "ES": ["bolsa; bolso", "Tu bolso está en la silla."],
        "FR": ["sac", "Ton sac est sur la chaise."],
    },
    "ball": {
        "RU": ["мяч", "Мяч под столом."],
        "ES": ["pelota; balón", "La pelota está debajo de la mesa."],
        "FR": ["ballon; balle", "Le ballon est sous la table."],
    },
    "banana": {
        "RU": ["банан", "Я ем банан."],
        "ES": ["plátano; banana", "Como un plátano."],
        "FR": ["banane", "Je mange une banane."],
    },
    "band": {
        "RU": ["группа; оркестр", "Группа играет музыку."],
        "ES": ["banda; grupo", "La banda toca música."],
        "FR": ["groupe; fanfare", "Le groupe joue de la musique."],
    },
    "bank (money)": {
        "RU": ["банк", "Банк открывается в девять."],
        "ES": ["banco", "El banco abre a las nueve."],
        "FR": ["banque", "La banque ouvre à neuf heures."],
    },
    "bath": {
        "RU": ["ванна", "Я принимаю ванну ночью."],
        "ES": ["baño; bañera", "Tomo un baño por la noche."],
        "FR": ["bain", "Je prends un bain le soir."],
    },
    "bathroom": {
        "RU": ["ванная комната", "Ванная комната чистая."],
        "ES": ["baño", "El baño está limpio."],
        "FR": ["salle de bain", "La salle de bain est propre."],
    },
    "be": {
        "RU": ["быть", "Я счастлив."],
        "ES": ["ser; estar", "Estoy feliz."],
        "FR": ["être", "Je suis heureux."],
    },
    "beach": {
        "RU": ["пляж", "Мы сидим на пляже."],
        "ES": ["playa", "Nos sentamos en la playa."],
        "FR": ["plage", "Nous sommes assis sur la plage."],
    },
    "beautiful": {
        "RU": ["красивый", "Цветок красивый."],
        "ES": ["hermoso; bonito", "La flor es hermosa."],
        "FR": ["beau; belle", "La fleur est belle."],
    },
    "because": {
        "RU": ["потому что", "Я остаюсь дома, потому что болен."],
        "ES": ["porque", "Me quedo en casa porque estoy enfermo."],
        "FR": ["parce que", "Je reste à la maison parce que je suis malade."],
    },
    "become": {
        "RU": ["становиться", "Может стать холодно."],
        "ES": ["volverse; convertirse en", "Puede volverse frío."],
        "FR": ["devenir", "Il peut faire froid."],
    },
    "bed": {
        "RU": ["кровать", "Кровать большая."],
        "ES": ["cama", "La cama es grande."],
        "FR": ["lit", "Le lit est grand."],
    },
    "bedroom": {
        "RU": ["спальня", "Моя спальня тихая."],
        "ES": ["dormitorio; habitación", "Mi dormitorio es tranquilo."],
        "FR": ["chambre", "Ma chambre est calme."],
    },
    "beer": {
        "RU": ["пиво", "Он пьёт пиво за ужином."],
        "ES": ["cerveza", "Él bebe cerveza con la cena."],
        "FR": ["bière", "Il boit de la bière avec le dîner."],
    },
    "before": {
        "RU": ["перед; до", "Вымойте руки перед обедом."],
        "ES": ["antes de", "Lávate las manos antes del almuerzo."],
        "FR": ["avant", "Lave-toi les mains avant le déjeuner."],
    },
    "begin": {
        "RU": ["начинать", "Начните тест сейчас."],
        "ES": ["empezar; comenzar", "Empieza el examen ahora."],
        "FR": ["commencer", "Commence le test maintenant."],
    },
    "beginning": {
        "RU": ["начало", "Начало лёгкое."],
        "ES": ["principio; comienzo", "El comienzo es fácil."],
        "FR": ["début", "Le début est facile."],
    },
    "behind": {
        "RU": ["позади; за", "Кошка за диваном."],
        "ES": ["detrás de", "El gato está detrás del sofá."],
        "FR": ["derrière", "Le chat est derrière le canapé."],
    },
    "believe": {
        "RU": ["верить", "Я верю тебе."],
        "ES": ["creer", "Te creo."],
        "FR": ["croire", "Je te crois."],
    },
    "below": {
        "RU": ["ниже; под", "Имя находится ниже картинки."],
        "ES": ["debajo de", "El nombre está debajo de la imagen."],
        "FR": ["sous; ci-dessous", "Le nom est sous l'image."],
    },
    "best": {
        "RU": ["лучший", "Она моя лучшая подруга."],
        "ES": ["mejor", "Ella es mi mejor amiga."],
        "FR": ["meilleur", "Elle est ma meilleure amie."],
    },
    "better": {
        "RU": ["лучше", "Сегодня я чувствую себя лучше."],
        "ES": ["mejor", "Hoy me siento mejor."],
        "FR": ["mieux; meilleur", "Je me sens mieux aujourd'hui."],
    },
    "between": {
        "RU": ["между", "Кафе находится между двумя магазинами."],
        "ES": ["entre", "El café está entre dos tiendas."],
        "FR": ["entre", "Le café est entre deux magasins."],
    },
    "bicycle": {
        "RU": ["велосипед", "Мой велосипед синий."],
        "ES": ["bicicleta", "Mi bicicleta es azul."],
        "FR": ["vélo; bicyclette", "Mon vélo est bleu."],
    },
    "big": {
        "RU": ["большой", "Эта коробка большая."],
        "ES": ["grande", "Esta caja es grande."],
        "FR": ["grand", "Cette boîte est grande."],
    },
    "bike": {
        "RU": ["велосипед", "Я езжу на велосипеде."],
        "ES": ["bicicleta", "Monto en bicicleta."],
        "FR": ["vélo", "Je fais du vélo."],
    },
    "bill": {
        "RU": ["счёт", "Счёт на столе."],
        "ES": ["cuenta; factura", "La cuenta está en la mesa."],
        "FR": ["addition; facture", "L'addition est sur la table."],
    },
    "bird": {
        "RU": ["птица", "Птица на дереве."],
        "ES": ["pájaro; ave", "Hay un pájaro en el árbol."],
        "FR": ["oiseau", "Un oiseau est dans l'arbre."],
    },
    "birthday": {
        "RU": ["день рождения", "Сегодня мой день рождения."],
        "ES": ["cumpleaños", "Hoy es mi cumpleaños."],
        "FR": ["anniversaire", "Aujourd'hui, c'est mon anniversaire."],
    },
    "black": {
        "RU": ["чёрный", "Моя сумка чёрная."],
        "ES": ["negro", "Mi bolso es negro."],
        "FR": ["noir", "Mon sac est noir."],
    },
    "blog": {
        "RU": ["блог", "Она пишет блог."],
        "ES": ["el blog", "Ella escribe un blog."],
        "FR": ["le blog", "Elle écrit un blog."],
    },
    "blonde": {
        "RU": ["светловолосый; блондин", "У него светлые волосы."],
        "ES": ["rubio", "Él tiene el pelo rubio."],
        "FR": ["blond", "Il a les cheveux blonds."],
    },
    "blue": {
        "RU": ["синий; голубой", "Небо голубое."],
        "ES": ["azul", "El cielo es azul."],
        "FR": ["bleu", "Le ciel est bleu."],
    },
    "boat": {
        "RU": ["лодка; катер", "Лодка на воде."],
        "ES": ["barco; bote", "El barco está en el agua."],
        "FR": ["bateau", "Le bateau est sur l'eau."],
    },
    "body": {
        "RU": ["тело", "Моё тело устало."],
        "ES": ["cuerpo", "Mi cuerpo está cansado."],
        "FR": ["corps", "Mon corps est fatigué."],
    },
    "book": {
        "RU": ["книга", "Я читаю книгу."],
        "ES": ["libro", "Leo un libro."],
        "FR": ["livre", "Je lis un livre."],
    },
    "boot": {
        "RU": ["ботинок; сапог", "Один ботинок под кроватью."],
        "ES": ["bota", "Una bota está debajo de la cama."],
        "FR": ["botte", "Une botte est sous le lit."],
    },
    "bored": {
        "RU": ["скучающий", "Мне скучно."],
        "ES": ["aburrido", "Estoy aburrido."],
        "FR": ["s'ennuyer; ennuyé", "Je m'ennuie."],
    },
    "boring": {
        "RU": ["скучный", "Этот фильм скучный."],
        "ES": ["aburrido", "Esta película es aburrida."],
        "FR": ["ennuyeux", "Ce film est ennuyeux."],
    },
    "born": {
        "RU": ["родившийся", "Я родился в мае."],
        "ES": ["nacido", "Nací en mayo."],
        "FR": ["né", "Je suis né en mai."],
    },
    "both": {
        "RU": ["оба; обе", "Обе девочки счастливы."],
        "ES": ["ambos; ambas", "Las dos chicas están felices."],
        "FR": ["les deux", "Les deux filles sont heureuses."],
    },
    "bottle": {
        "RU": ["бутылка", "Бутылка полная."],
        "ES": ["botella", "La botella está llena."],
        "FR": ["bouteille", "La bouteille est pleine."],
    },
    "box": {
        "RU": ["коробка", "Коробка открыта."],
        "ES": ["caja", "La caja está abierta."],
        "FR": ["boîte", "La boîte est ouverte."],
    },
    "boy": {
        "RU": ["мальчик", "Мальчик быстро бежит."],
        "ES": ["niño; chico", "El niño corre rápido."],
        "FR": ["garçon", "Le garçon court vite."],
    },
    "boyfriend": {
        "RU": ["парень; бойфренд", "Её парень добрый."],
        "ES": ["novio", "Su novio es amable."],
        "FR": ["petit ami", "Son petit ami est gentil."],
    },
    "bread": {
        "RU": ["хлеб", "Я хочу хлеб."],
        "ES": ["pan", "Quiero pan."],
        "FR": ["pain", "Je veux du pain."],
    },
    "break": {
        "RU": ["ломать; разбить", "Не разбей чашку."],
        "ES": ["romper", "No rompas la taza."],
        "FR": ["casser", "Ne casse pas la tasse."],
    },
    "breakfast": {
        "RU": ["завтрак", "Завтрак готов."],
        "ES": ["desayuno", "El desayuno está listo."],
        "FR": ["petit déjeuner", "Le petit déjeuner est prêt."],
    },
    "bring": {
        "RU": ["принести; приносить", "Принеси свою книгу."],
        "ES": ["traer", "Trae tu libro."],
        "FR": ["apporter", "Apporte ton livre."],
    },
    "brother": {
        "RU": ["брат", "Мой брат высокий."],
        "ES": ["hermano", "Mi hermano es alto."],
        "FR": ["frère", "Mon frère est grand."],
    },
    "brown": {
        "RU": ["коричневый", "Собака коричневая."],
        "ES": ["marrón; café", "El perro es marrón."],
        "FR": ["marron; brun", "Le chien est marron."],
    },
    "build": {
        "RU": ["строить", "Они строят дом."],
        "ES": ["construir", "Ellos construyen una casa."],
        "FR": ["construire", "Ils construisent une maison."],
    },
    "building": {
        "RU": ["здание", "Это здание старое."],
        "ES": ["edificio", "Este edificio es viejo."],
        "FR": ["bâtiment", "Ce bâtiment est vieux."],
    },
    "bus": {
        "RU": ["автобус", "Автобус опаздывает."],
        "ES": ["autobús", "El autobús llega tarde."],
        "FR": ["bus", "Le bus est en retard."],
    },
    "business": {
        "RU": ["бизнес; дело", "У моего отца есть бизнес."],
        "ES": ["negocio; empresa", "Mi padre tiene un negocio."],
        "FR": ["entreprise; affaires", "Mon père a une entreprise."],
    },
    "busy": {
        "RU": ["занятый", "Я сегодня занят."],
        "ES": ["ocupado", "Estoy ocupado hoy."],
        "FR": ["occupé", "Je suis occupé aujourd'hui."],
    },
    "but": {
        "RU": ["но", "Я люблю чай, но не кофе."],
        "ES": ["pero", "Me gusta el té, pero no el café."],
        "FR": ["mais", "J'aime le thé, mais pas le café."],
    },
    "butter": {
        "RU": ["масло", "Намажь масло на хлеб."],
        "ES": ["mantequilla", "Pon mantequilla en el pan."],
        "FR": ["beurre", "Mets du beurre sur le pain."],
    },
    "buy": {
        "RU": ["покупать", "Я покупаю молоко."],
        "ES": ["comprar", "Compro leche."],
        "FR": ["acheter", "J'achète du lait."],
    },
    "by": {
        "RU": ["у; рядом с; посредством", "Сядь у окна."],
        "ES": ["junto a; por", "Siéntate junto a la ventana."],
        "FR": ["près de; par", "Assieds-toi près de la fenêtre."],
    },
    "bye": {
        "RU": ["пока; до свидания", "Пока, увидимся завтра."],
        "ES": ["adiós; chao", "Adiós, nos vemos mañana."],
        "FR": ["au revoir; salut", "Au revoir, à demain."],
    },
    "cafe": {
        "RU": ["кафе", "Мы встречаемся в кафе."],
        "ES": ["cafetería", "Nos vemos en la cafetería."],
        "FR": ["café", "Nous nous retrouvons au café."],
    },
    "cake": {
        "RU": ["торт; пирожное", "Торт сладкий."],
        "ES": ["pastel; tarta", "El pastel es dulce."],
        "FR": ["gâteau", "Le gâteau est sucré."],
    },
    "call": {
        "RU": ["звонить; звонок", "Пожалуйста, позвони мне."],
        "ES": ["llamar", "Por favor, llámame."],
        "FR": ["appeler", "Appelle-moi, s'il te plaît."],
    },
    "camera": {
        "RU": ["камера; фотоаппарат", "Моя камера новая."],
        "ES": ["cámara", "Mi cámara es nueva."],
        "FR": ["appareil photo", "Mon appareil photo est neuf."],
    },
    "can1 modal": {
        "RU": ["мочь; уметь", "Я умею плавать."],
        "ES": ["poder", "Puedo nadar."],
        "FR": ["pouvoir", "Je peux nager."],
    },
    "cannot": {
        "RU": ["не мочь", "Я не могу прийти сегодня."],
        "ES": ["no poder", "No puedo venir hoy."],
        "FR": ["ne pas pouvoir", "Je ne peux pas venir aujourd'hui."],
    },
    "capital": {
        "RU": ["столица", "Париж — столица."],
        "ES": ["capital", "París es una capital."],
        "FR": ["capitale", "Paris est une capitale."],
    },
    "car": {
        "RU": ["машина; автомобиль", "Машина красная."],
        "ES": ["coche; carro", "El coche es rojo."],
        "FR": ["voiture", "La voiture est rouge."],
    },
    "card": {
        "RU": ["карточка; открытка", "У меня есть открытка на день рождения."],
        "ES": ["tarjeta", "Tengo una tarjeta de cumpleaños."],
        "FR": ["carte", "J'ai une carte d'anniversaire."],
    },
    "career": {
        "RU": ["карьера", "Я хочу карьеру в искусстве."],
        "ES": ["carrera profesional", "Quiero una carrera en el arte."],
        "FR": ["carrière", "Je veux une carrière dans l'art."],
    },
    "carrot": {
        "RU": ["морковь", "Морковь оранжевая."],
        "ES": ["zanahoria", "La zanahoria es naranja."],
        "FR": ["carotte", "La carotte est orange."],
    },
    "carry": {
        "RU": ["нести; носить", "Я несу свою сумку."],
        "ES": ["llevar; cargar", "Llevo mi bolso."],
        "FR": ["porter", "Je porte mon sac."],
    },
    "cat": {
        "RU": ["кот; кошка", "Кошка спит."],
        "ES": ["gato", "El gato duerme."],
        "FR": ["chat", "Le chat dort."],
    },
    "CD": {
        "RU": ["компакт-диск", "На этом диске есть музыка."],
        "ES": ["el CD", "Este CD tiene música."],
        "FR": ["le CD", "Ce CD contient de la musique."],
    },
    "cent": {
        "RU": ["цент", "Один цент очень мал."],
        "ES": ["centavo; céntimo", "Un centavo es muy pequeño."],
        "FR": ["centime", "Un centime est très petit."],
    },
    "centre": {
        "RU": ["центр", "Центр города оживлённый."],
        "ES": ["centro", "El centro de la ciudad está concurrido."],
        "FR": ["centre", "Le centre-ville est animé."],
    },
    "century": {
        "RU": ["век; столетие", "Век — это сто лет."],
        "ES": ["siglo", "Un siglo son cien años."],
        "FR": ["siècle", "Un siècle dure cent ans."],
    },
    "chair": {
        "RU": ["стул", "Сядь на стул."],
        "ES": ["silla", "Siéntate en la silla."],
        "FR": ["chaise", "Assieds-toi sur la chaise."],
    },
    "change": {
        "RU": ["менять; изменение", "Я переодеваюсь."],
        "ES": ["cambiar; cambio", "Me cambio de ropa."],
        "FR": ["changer; changement", "Je change de vêtements."],
    },
    "chart": {
        "RU": ["диаграмма; график", "Посмотрите на диаграмму."],
        "ES": ["gráfico; tabla", "Mira el gráfico."],
        "FR": ["graphique; tableau", "Regarde le graphique."],
    },
    "cheap": {
        "RU": ["дешёвый", "Эта рубашка дешёвая."],
        "ES": ["barato", "Esta camisa es barata."],
        "FR": ["bon marché; pas cher", "Cette chemise est bon marché."],
    },
    "check": {
        "RU": ["проверять", "Проверь свой ответ."],
        "ES": ["comprobar; revisar", "Revisa tu respuesta."],
        "FR": ["vérifier", "Vérifie ta réponse."],
    },
    "cheese": {
        "RU": ["сыр", "Я люблю сыр."],
        "ES": ["queso", "Me gusta el queso."],
        "FR": ["fromage", "J'aime le fromage."],
    },
    "chicken": {
        "RU": ["курица; курятина", "Мы едим курицу на ужин."],
        "ES": ["pollo", "Comemos pollo para la cena."],
        "FR": ["poulet", "Nous mangeons du poulet au dîner."],
    },
    "child": {
        "RU": ["ребёнок", "Ребёнок счастлив."],
        "ES": ["niño; niña", "El niño está feliz."],
        "FR": ["enfant", "L'enfant est heureux."],
    },
    "chocolate": {
        "RU": ["шоколад", "Шоколад сладкий."],
        "ES": ["chocolate", "El chocolate es dulce."],
        "FR": ["chocolat", "Le chocolat est sucré."],
    },
    "choose": {
        "RU": ["выбирать", "Выберите один ответ."],
        "ES": ["elegir", "Elige una respuesta."],
        "FR": ["choisir", "Choisis une réponse."],
    },
    "cinema": {
        "RU": ["кинотеатр; кино", "Мы идём в кино."],
        "ES": ["cine", "Vamos al cine."],
        "FR": ["cinéma", "Nous allons au cinéma."],
    },
    "city": {
        "RU": ["город", "Город большой."],
        "ES": ["ciudad", "La ciudad es grande."],
        "FR": ["ville", "La ville est grande."],
    },
    "class": {
        "RU": ["урок; класс", "Урок начинается в девять."],
        "ES": ["clase", "La clase empieza a las nueve."],
        "FR": ["cours; classe", "Le cours commence à neuf heures."],
    },
    "classroom": {
        "RU": ["классная комната", "В классе тихо."],
        "ES": ["aula", "El aula está tranquila."],
        "FR": ["salle de classe", "La salle de classe est calme."],
    },
    "clean": {
        "RU": ["чистый; чистить", "Комната чистая."],
        "ES": ["limpio; limpiar", "La habitación está limpia."],
        "FR": ["propre; nettoyer", "La pièce est propre."],
    },
    "climb": {
        "RU": ["подниматься; карабкаться", "Они поднимаются на холм."],
        "ES": ["subir; escalar", "Ellos suben la colina."],
        "FR": ["grimper; monter", "Ils montent la colline."],
    },
    "clock": {
        "RU": ["часы", "Часы на стене."],
        "ES": ["reloj", "El reloj está en la pared."],
        "FR": ["horloge", "L'horloge est au mur."],
    },
    "close1": {
        "RU": ["закрыть", "Закрой дверь, пожалуйста."],
        "ES": ["cerrar", "Cierra la puerta, por favor."],
        "FR": ["fermer", "Ferme la porte, s'il te plaît."],
    },
}


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def read_jsonl(path):
    rows = []
    for index, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path}:{index}: {error}") from error
    return rows


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def validate_translation_map(source_rows):
    source_keys = {row["source_headword"] for row in source_rows}
    missing = sorted(source_keys - set(TRANSLATIONS))
    extra = sorted(set(TRANSLATIONS) - source_keys)
    if missing:
        raise ValueError(f"Missing translations for rows: {missing}")
    if extra:
        raise ValueError(f"Translation map has unused rows: {extra}")
    problems = []
    for source_headword, localized in TRANSLATIONS.items():
        for language in LANGUAGES:
            display, example = localized.get(language, ["", ""])
            if not normalize_text(display):
                problems.append(f"{source_headword}/{language}: missing display")
            if not normalize_text(example):
                problems.append(f"{source_headword}/{language}: missing example")
            if not SENTENCE_END_RE.search(example):
                problems.append(f"{source_headword}/{language}: example missing sentence punctuation")
            if language == "RU" and not re.search(r"[\u0400-\u04FF]", example):
                problems.append(f"{source_headword}/{language}: example has no Cyrillic text")
            if language in {"ES", "FR"} and not re.search(r"[A-Za-zÀ-ž]", display):
                problems.append(f"{source_headword}/{language}: display has no Latin text")
    if problems:
        raise ValueError("Translation quality problems:\n" + "\n".join(problems))


def build_row(row, generated_at):
    localized = TRANSLATIONS[row["source_headword"]]
    blockers = [
        blocker
        for blocker in row.get("remaining_blockers", [])
        if blocker not in {"support_translation_meaning_check", "support_example_scene_check"}
    ]
    out = {
        "release_id": row["release_id"],
        "course_id": row["course_id"],
        "row_id": row["row_id"],
        "core_item_id": row["core_item_id"],
        "meaning_id": row["meaning_id"],
        "source_candidate_id": row["source_candidate_id"],
        "source_headword": row["source_headword"],
        "reviewed_display_headword": row["reviewed_display_headword"],
        "reviewed_part_of_speech": row["reviewed_part_of_speech"],
        "meaning_note": row["meaning_note"],
        "example_EN": row["example_EN"],
        "support_translation_batch": "ru_es_fr_v1",
        "support_translation_status": "draft_native_style_needs_source_assisted_qa",
        "support_example_status": "draft_scene_preserving_needs_source_assisted_qa",
        "source_note": "Internal LunaCards Oxford support-language draft; support aid for English learning, not ordinary polyglot final delivery.",
        "reviewer": "codex_oxford_a1_support_translation_batch_ru_es_fr_v1",
        "reviewed_at": generated_at,
        "generation_ready": False,
        "remaining_blockers": blockers,
    }
    for language in LANGUAGES:
        display, example = localized[language]
        out[language] = normalize_text(display)
        out[f"example_{language}"] = normalize_text(example)
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pronunciations",
        default="outputs/oxford-vocabulary/pronunciations/oxford_3000_core_a1_part_001_150_v1_en_us_pronunciations_v1.jsonl",
    )
    parser.add_argument("--out-dir", default="outputs/oxford-vocabulary/support-translations")
    parser.add_argument("--batch-id", default="ru_es_fr_v1")
    args = parser.parse_args()

    source_path = Path(args.pronunciations)
    source_rows = read_jsonl(source_path)
    if not source_rows:
        raise ValueError("Source pronunciation artifact is empty")
    validate_translation_map(source_rows)

    generated_at = datetime.now(timezone.utc).isoformat()
    rows = [build_row(row, generated_at) for row in source_rows]
    release_id = source_rows[0]["release_id"]
    output_dir = Path(args.out_dir)
    batch_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}.jsonl"
    summary_path = output_dir / f"{release_id}_support_translation_batch_{args.batch_id}_summary.md"
    write_jsonl(batch_path, rows)

    summary = [
        f"# Oxford A1 Support Translation Batch {args.batch_id}: {release_id}",
        "",
        f"- Script version: `{SCRIPT_VERSION}`",
        f"- Source rows: `{source_path}`",
        f"- Rows: {len(rows)}",
        f"- Languages: {', '.join(LANGUAGES)}",
        "- Translation status: `draft_native_style_needs_source_assisted_qa`",
        "- Example status: `draft_scene_preserving_needs_source_assisted_qa`",
        "- Target-language transcriptions: not included",
        "- Postgres import: false",
        "- Google Sheet delivery: false",
        "",
        "This artifact is a partial support-language layer for English learning. It does not close the full support-language gate until all configured support languages are covered and reviewed.",
        "",
    ]
    summary_path.write_text("\n".join(summary), encoding="utf-8")
    print(f"Oxford support translation batch built: rows={len(rows)} languages={','.join(LANGUAGES)} path={batch_path}")


if __name__ == "__main__":
    main()
