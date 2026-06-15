#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SCRIPT_VERSION = "2026-05-21.v1";
const LANGUAGE = "RU";
const BATCH_ID = "ru_v1";
const SENTENCE_END_RE = /[.!?。！？]$/u;

const RU_TRANSLATIONS_TSV = `source_headword	RU	example_RU
ability	способность; умение	Её умение плавать очевидно.
able	способный; умеющий	Он может прийти сегодня.
abroad	за границей; за границу	Она хочет учиться за границей.
accept	принимать; принять	Пожалуйста, примите этот небольшой подарок.
accident	несчастный случай; авария	Авария произошла рядом со школой.
according to	согласно; по словам	Согласно отчёту, будет дождь.
achieve	достигать; добиться	Ты можешь достичь своей цели.
act	действовать; играть роль	Он может играть в пьесе.
active	активный	Она активна каждый день.
actually	на самом деле; вообще-то	На самом деле мне нужно больше времени.
advantage	преимущество	У этого плана есть преимущество.
adventure	приключение	Их поездка была приключением.
advertise	рекламировать	Они рекламируют новую работу.
advertisement	реклама; объявление	Я увидел объявление.
advertising	реклама; рекламная деятельность	Реклама помогает продавать еду.
affect	влиять	Сон может влиять на здоровье.
against	против; к	Не прислоняйтесь к стене.
ah	а; ах	А, теперь я понимаю.
airline	авиакомпания	Авиакомпания очень занята.
alive	живой	Маленькая рыба жива.
all right	в порядке; хорошо	Теперь всё в порядке.
allow	позволять; разрешать	Здесь разрешают собак.
almost	почти	Мы почти готовы.
alone	один; в одиночестве	Она живёт одна.
along	вдоль; по	Идите вдоль этой дороги.
already	уже	Я уже знаю ответ.
alternative	альтернатива; другой вариант	Этот поезд — альтернатива.
although	хотя	Хотя поздно, мы можем остаться.
among	среди	Он стоял среди деревьев.
amount	количество; сумма	Количество слишком маленькое.
ancient	древний	Эта древняя стена известна.
ankle	лодыжка	У меня сегодня болит лодыжка.
anybody	кто-нибудь; любой	Кто-нибудь может ответить?
any more	больше; уже не	Мне больше ничего не нужно.
anyway	в любом случае; всё равно	В любом случае мы можем начать.
anywhere	где угодно; куда угодно	Сядьте где угодно.
app	приложение	Это приложение полезное.
appear	появляться	Её имя появится здесь.
appearance	внешность; внешний вид	Его внешний вид другой.
apply	подавать заявление; применять	Подайте заявление на работу сегодня.
architect	архитектор	У архитектора есть план.
architecture	архитектура	Мне нравится современная архитектура.
argue	спорить	Не спорь с сестрой.
argument	спор; аргумент	Спор был коротким.
army	армия	Армия большая.
arrange	организовывать; расставлять	Пожалуйста, организуйте встречу.
arrangement	договорённость; расположение	Эта договорённость хорошо работает.
asleep	спящий	Малыш спит.
assistant	помощник; ассистент	Помощник помог мне.
athlete	спортсмен; спортсменка	Спортсмен быстро бегает.
attack	нападать; атака	Собака может напасть.
attend	посещать; присутствовать	Я сегодня посещаю урок.
attention	внимание	Пожалуйста, обратите внимание.
attractive	привлекательный	Сад привлекательный.
audience	аудитория; зрители	Зрители были тихими.
author	автор	Автор написал эту книгу.
available	доступный; имеющийся	Еда сейчас доступна.
average	средний	Средний результат был хорошим.
avoid	избегать	Избегайте оживлённой дороги.
award	награда; награждать	Она получила награду.
awful	ужасный	Погода была ужасной.
background	фон; происхождение	На картинке тёмный фон.
badly	плохо	Он сегодня играл плохо.
bar	бар; стойка	Мы встретились в баре отеля.
baseball	бейсбол	Бейсбол здесь популярен.
based	основанный	Фильм основан на книге.
basketball	баскетбол	Мы играем в баскетбол после школы.
bean	боб; фасоль	Этот боб зелёный.
bear (animal)	медведь	Медведь живёт в лесу.
beat	побеждать; бить	Наша команда может их победить.
beef	говядина	Я ел говядину на ужин.
behave	вести себя	Пожалуйста, веди себя хорошо на уроке.
behaviour	поведение	Его поведение было вежливым.
belong	принадлежать	Эти туфли принадлежат мне.
belt	ремень	Его ремень чёрный.
benefit	польза; преимущество	У упражнений есть реальная польза.
billion	миллиард	Миллиард — огромное число.
bin	мусорное ведро	Положите бумагу в мусорное ведро.
biology	биология	Биология — мой лучший предмет.
birth	рождение	Её рождение было в мае.
biscuit	печенье	Она ест печенье.
bit	немного; кусочек	Мне нужно немного больше времени.
blank	пустой; пропуск	Напишите имя в пустом месте.
blood	кровь	Кровь красная.
blow	дуть	Ветер может сильно дуть.
board	доска; борт	Напишите это на доске.
boil	кипятить; кипеть	Сначала вскипятите воду.
bone	кость	У собаки есть кость.
borrow	брать взаймы	Можно мне одолжить вашу ручку?
boss	начальник; босс	Мой начальник дружелюбный.
bottom	низ; нижняя часть	Подпишите внизу.
bowl	миска; чаша	Миска полная.
brain	мозг	Вашему мозгу нужен отдых.
bridge	мост	Мост старый.
bright	яркий; умный	Комната яркая.
brilliant	блестящий; отличный	Эта идея отличная.
broken	сломанный	Стул сломан.
brush	щётка; чистить щёткой	Почистите зубы сейчас.
burn	гореть; обжечь	Не сожгите хлеб.
businessman	бизнесмен	Бизнесмен пришёл рано.
button	кнопка; пуговица	Нажмите красную кнопку.
camp	лагерь; разбивать лагерь	Мы ставим лагерь у озера.
camping	кемпинг; поход с палаткой	Кемпинг летом весёлый.
can2	банка	Откройте банку осторожно.
care	забота; заботиться	Берегите своё здоровье.
careful	осторожный; внимательный	Будьте осторожны на лестнице.
carefully	осторожно; внимательно	Прочитайте вопрос внимательно.
carpet	ковёр	Ковёр мягкий.
cartoon	мультфильм	Этот мультфильм смешной.
case	случай; футляр	Положите это в футляр.
cash	наличные	Я заплатил наличными.
castle	замок	Замок очень старый.
catch	ловить; поймать	Поймайте мяч сейчас.
cause	причина; вызывать	Дождь может вызвать проблемы.
celebrate	праздновать	Мы празднуем мой день рождения.
celebrity	знаменитость	Знаменитость была очень доброй.
certain	уверенный; определённый	Я уверен в этом.
certainly	конечно; безусловно	Я обязательно помогу.
chance	шанс; возможность	У тебя есть шанс.
character	персонаж; характер	Этот персонаж смелый.
charity	благотворительность; благотворительная организация	Благотворительная организация помогает детям.
chat	болтать; чат	Мы болтаем после урока.
chef	шеф-повар	Шеф-повар приготовил суп.
chemistry	химия	Химия для меня трудная.
chip	чип; кусочек	Этот чип солёный.
choice	выбор	Этот выбор важен.
church	церковь	Церковь рядом.
cigarette	сигарета	Сигарета вредна для здоровья.
circle	круг; обводить	Нарисуйте здесь круг.
classical	классический	Мне нравится классическая музыка.
clear	ясный; очищать	Ответ ясный.
clearly	ясно; чётко	Говорите ясно, пожалуйста.
clever	умный	Она умный ребёнок.
climate	климат	Климат меняется.
close2	близкий; близко	Моя школа близко к дому.
closed	закрытый	Магазин закрыт.
clothing	одежда	Тёплая одежда полезна.
cloud	облако	Облако закрывает солнце.
coach	тренер; автобус	Тренер помог команде.
coast	побережье	Мы ехали вдоль побережья.
code	код	Введите код здесь.
colleague	коллега	Мой коллега позвонил мне.
collect	собирать	Я собираю старые карточки.
column	столбец; колонка	Прочитайте первый столбец.
comedy	комедия	Эта комедия смешная.
comfortable	удобный	Этот стул удобный.
comment	комментарий; комментировать	Оставьте комментарий ниже.
communicate	общаться; передавать информацию	Мы общаемся по электронной почте.
community	сообщество; община	Наше сообщество дружелюбное.
compete	соревноваться	Они соревнуются каждый год.
competition	соревнование; конкурс	Соревнование начинается завтра.
complain	жаловаться	Не жалуйтесь снова.
completely	полностью	Я полностью согласен с вами.
condition	состояние; условие	Машина в хорошем состоянии.
conference	конференция	Конференция начинается в девять.
connect	соединять; подключать	Подключите телефон к компьютеру.
connected	соединённый; связанный	Эти две идеи связаны.
consider	рассматривать; обдумывать	Пожалуйста, обдумайте мою идею.
contain	содержать	В этой коробке книги.
context	контекст	Контекст помогает понять.
continent	континент	Континент очень большой.
continue	продолжать	Продолжайте читать, пожалуйста.
control	контроль; управлять	Контролируйте скорость внимательно.
cooker	плита	Плита чистая.
copy	копия; копировать	Сделайте копию для меня.
corner	угол	Сядьте в углу.
correctly	правильно	Напишите ответ правильно.
count	считать; количество	Посчитайте книги.
couple	пара	Пара пришла рано.
cover	накрывать; крышка	Накройте миску.
crazy	сумасшедший; безумный	Эта идея звучит безумно.
creative	творческий	У неё творческая идея.
credit	кредит; зачёт	Я заплатил кредитной картой.
crime	преступление; преступность	Преступность — серьёзная проблема.
criminal	преступник; преступный	Преступник быстро ушёл.
cross	пересекать; крест	Переходите улицу осторожно.
crowd	толпа	Толпа ждала снаружи.
crowded	переполненный	Поезд был переполнен.
cry	плакать; крик	Не плачьте сейчас.
cupboard	шкаф	Чашки в шкафу.
curly	кудрявый	У неё кудрявые волосы.
cycle	ездить на велосипеде; цикл	Я езжу на велосипеде в школу.
daily	ежедневный; ежедневно	Я читаю новости ежедневно.
danger	опасность	Знак показывает опасность.
data	данные	Эти данные полезны.
dead	мёртвый	Растение мёртвое.
deal	сделка; дело	Это хорошая сделка.
death	смерть	Смерть — трудная тема.
decision	решение	Примите решение сегодня.
deep	глубокий; глубоко	Вода глубокая.
definitely	определённо	Я определённо хочу чай.
degree	степень; диплом	Мой диплом по истории.
dentist	стоматолог	Стоматолог проверил мои зубы.
department	отдел	Обувной отдел наверху.
depend	зависеть	Это зависит от погоды.
desert	пустыня	Пустыня очень сухая.
designer	дизайнер	Дизайнер создал это платье.
destroy	разрушать; уничтожать	Не уничтожайте файл.
detective	детектив	Детектив нашёл ключ.
develop	развивать; разрабатываться	Они разрабатывают новое приложение.
device	устройство	Это устройство полезное.
diary	дневник	Она пишет в дневнике.
differently	иначе; по-другому	Мы делаем это иначе.
digital	цифровой	Это цифровая камера.
direct	прямой; направлять	Сядьте на прямой поезд.
direction	направление	Идите в этом направлении.
director	директор; режиссёр	Режиссёру понравился фильм.
disagree	не соглашаться	Я не согласен с этой идеей.
disappear	исчезать	Солнце скоро исчезнет.
disaster	бедствие; катастрофа	Шторм был катастрофой.
discover	обнаруживать; открывать	Они открывают новый остров.
discovery	открытие	Открытие изменило науку.
discussion	обсуждение	Обсуждение закончилось рано.
disease	болезнь	Эта болезнь серьёзная.
distance	расстояние	Расстояние короткое.
divorced	разведённый	Её родители разведены.
document	документ; документировать	Сохраните этот документ сейчас.
double	двойной; удваивать	Мне нужен двухместный номер.
download	скачивать; загрузка	Скачайте приложение сегодня.
drama	драма	Драма начинается сегодня вечером.
drawing	рисунок	Её рисунок красивый.
dream	сон; мечта	У меня был странный сон.
driving	вождение	Вождение ночью трудное.
drop	ронять; падение	Не уроните стакан.
drug	лекарство; наркотик	Лекарство помогло ему.
dry	сухой; сушить	Полотенце сухое.
earn	зарабатывать	Я зарабатываю деньги на работе.
earth	земля; Земля	Земля круглая.
easily	легко	Она легко учится.
education	образование	Образование важно.
effect	эффект; влияние	Эффект был ясным.
either	любой из двух; тоже не	Любой ответ подходит.
electric	электрический	Эта машина электрическая.
electrical	электрический	Электрическая система безопасна.
electricity	электричество	Электричество здесь дорогое.
electronic	электронный	Этот электронный билет работает.
employ	нанимать	Они нанимают пять человек.
employee	сотрудник; работник	Сотрудник усердно работает.
employer	работодатель	Мой работодатель справедливый.
empty	пустой; опустошать	Комната пустая.
ending	конец; концовка	Концовка была неожиданной.
energy	энергия	Сегодня у меня нет энергии.
engine	двигатель	Двигатель громкий.
engineer	инженер	Инженер починил мост.
enormous	огромный	Здание огромное.
enter	входить; вводить	Войдите в комнату тихо.
environment	окружающая среда	Берегите окружающую среду.
equipment	оборудование	Это оборудование дорогое.
error	ошибка	Я нашёл ошибку.
especially	особенно	Мне особенно нравится эта песня.
essay	эссе; сочинение	Напишите эссе сегодня вечером.
everyday	повседневный	Это повседневный английский.
everywhere	везде	Цветы растут везде.
evidence	доказательство; свидетельство	Доказательства ясны.
exact	точный	Назовите точное число.
exactly	точно; именно	Это точно правильно.
excellent	отличный	Ваша работа отличная.
except	кроме	Все пришли, кроме меня.
exist	существовать	Этот адрес существует?
expect	ожидать	Я ожидаю дождь завтра.
experience	опыт; переживание	У меня есть опыт работы с детьми.
experiment	эксперимент	Эксперимент прошёл хорошо.
expert	эксперт	Попросите помощи у эксперта.
explanation	объяснение	Её объяснение было ясным.
express	выражать	Пожалуйста, выразите своё мнение.
expression	выражение	Это выражение распространённое.
extreme	крайний; экстремальный	Жара была экстремальной.
extremely	чрезвычайно; очень	Очень холодно.
factor	фактор	Стоимость — один фактор.
factory	фабрика; завод	Фабрика закрывается в пять.
fail	провалиться; не сдать	Я не провалился.
fair	справедливый; честный	Цена справедливая.
fan	вентилятор; поклонник	Включите вентилятор.
farming	сельское хозяйство; фермерство	Фермерство — тяжёлая работа.
fashion	мода	Мода меняется каждый год.
fear	страх; бояться	Страх может останавливать людей.
feature	особенность; функция	У этого телефона есть полезная функция.
feed	кормить; корм	Покормите кота сейчас.
female	женский; женщина	Спортсменка победила.
fiction	художественная литература	Она читает художественную литературу ночью.
field	поле; область	Поле зелёное.
fight	драться; борьба	Они слишком много дерутся.
figure	фигура; число	Посмотрите на фигуру.
finally	наконец	Мы наконец приехали домой.
finger	палец	У меня болит палец.
firstly	во-первых	Во-первых, прочитайте вопрос.
fishing	рыбалка	Рыбалка здесь популярна.
fit	подходить; быть впору	Эти туфли хорошо подходят.
fix	чинить; исправлять	Почините сломанный стул.
flu	грипп	У меня грипп.
flying	полёт; летающий	Полёт быстрый.
focus	сосредоточиться; фокус	Сосредоточьтесь на этой задаче.
following	следующий; нижеследующий	Прочитайте следующее предложение.
foreign	иностранный	Она говорит на иностранном языке.
forest	лес	Лес тихий.
fork	вилка	Используйте вилку.
formal	официальный; формальный	Это письмо официальное.
fortunately	к счастью	К счастью, никто не пострадал.
forward	вперёд	Двигайтесь вперёд медленно.
fresh	свежий	Хлеб свежий.`;

function parseArgs(argv) {
  const args = {
    contract: "config/oxford_3000_core_a2_part_001_300_v1_contract_v0.json",
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
  const lines = RU_TRANSLATIONS_TSV.trim().split(/\r?\n/u);
  const header = lines.shift();
  if (header !== "source_headword\tRU\texample_RU") {
    throw new Error("Unexpected RU translation TSV header");
  }
  const map = new Map();
  for (const [index, line] of lines.entries()) {
    const parts = line.split("\t");
    if (parts.length !== 3) {
      throw new Error(`Bad RU translation row ${index + 2}: expected 3 tab-separated columns`);
    }
    const [sourceHeadword, display, example] = parts.map(normalizeText);
    if (!sourceHeadword || !display || !example) {
      throw new Error(`Bad RU translation row ${index + 2}: empty field`);
    }
    if (!SENTENCE_END_RE.test(example)) {
      throw new Error(`Bad RU example punctuation for ${sourceHeadword}`);
    }
    if (map.has(sourceHeadword)) {
      throw new Error(`Duplicate RU translation key: ${sourceHeadword}`);
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
    throw new Error(`Missing RU translations for source headwords: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`RU translation map has unused rows: ${extra.join(", ")}`);
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
    reviewer: "codex_oxford_a2_part001_support_translation_batch_ru_v1",
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
    RU: translation.display,
    example_RU: translation.example,
  };
}

function updateContract(contract, batchPath, summaryPath, rows) {
  const batch = {
    batch_id: BATCH_ID,
    status: "draft_native_style_needs_source_assisted_qa_not_delivery_ready",
    script_path: "scripts/oxford/build-oxford-a2-part001-support-translation-batch-ru.mjs",
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
  contract.latest_support_translation_batches = [
    ...existing.filter((item) => item.batch_id !== BATCH_ID),
    batch,
  ];
  contract.status = "support_language_batches_in_progress_not_delivery_ready";
  contract.next_stage_options = [
    "Generate the next support-language batch in language order: ES.",
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
    `# Oxford A2 Part 001 Support Translation Batch ${BATCH_ID}: ${releaseId}`,
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
