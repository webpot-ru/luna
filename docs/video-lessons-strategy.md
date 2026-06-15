# Video Lessons Strategy & Specifications

Этот документ фиксирует архитектуру, спецификации генерации и стратегию дистрибуции видеоуроков LunaCards на YouTube для привлечения поискового трафика на [flashcardsluna.com](https://flashcardsluna.com/). Список всех сгенерированных уроков и ссылки на них ведутся в [Video Lessons Registry](video-lessons-registry.md).

Статус: **Source of Truth**. Любые изменения в дизайне, структуре звука или дистрибуции видео должны фиксироваться здесь.

---

## 1. Стратегия дистрибуции на YouTube (YouTube Distribution)

Для исключения «каши» из десятков языков поддержки на одном канале и предотвращения путаницы в алгоритмах рекомендаций YouTube принята **Стратегия разделения каналов по языку зрителя (Support Language / Market)**.

### Архитектура каналов:
1. **«LunaCards — Учим языки»** (Флагманский канал для русскоязычной аудитории):
   * **Язык поддержки**: Только Русский (`RU`). Все переводы и озвучка перевода делаются только на русском.
   * **Контент**: Плейлисты по изучаемым целевым языкам:
     * *Испанский с нуля (на базе Spanish A1 Core Course)*
     * *Английский для начинающих (на базе Oxford Core)*
     * *Китайский язык (на базе HSK 3.0)*
2. **«LunaCards — Learn Languages»** (Для англоязычной аудитории):
   * **Язык поддержки**: Только Английский (`EN`).
   * **Контент**: Плейлисты: *Learn Spanish*, *Learn Chinese (HSK)*, *Learn German* и т.д.
3. **Другие региональные каналы**:
   * Создаются по мере необходимости по той же схеме (например, `LunaCards — Aprender Idiomas` для испаноязычной аудитории с поддержкой на `ES`).

> [!IMPORTANT]  
> **Региональные диалекты (США/Британия, Испания/Мексика)**:  
> **НЕ СОЗДАВАЙТЕ** отдельные YouTube-каналы для вариантов одного языка (например, "LunaCards для Американцев" и "LunaCards для Британцев"). Это размывает аудиторию и вредит алгоритмам YouTube.
> 
> * **Для языка поддержки (Support Language)**: Используйте один общий канал (например, Английский) с универсальным или самым массовым диалектом (US English).
> * **Для изучаемого языка (Target Language)**: Разные диалекты живут на **одном** канале, но в разных плейлистах (Например: плейлист "Learn Spanish (Spain)" и плейлист "Learn Spanish (Mexico)").

---

## 2. Спецификации видео и анимации (Video Specs)

### Формат и разрешение:
* **Разрешение**: Widescreen 16:9 (1920x1080).
* **Стиль**: Премиальный веб-дизайн, соответствующий визуальному стилю сайта *flashcardsluna.com* (светло-голубой фон `#f4f7f9`, белая карточка с закругленными углами `rounded-3xl` и мягкой тенью, темно-синий цвет шрифта `#0e224e`, прогресс-бар в верхней части экрана).
* **Адаптация под экраны**: Все тексты и элементы увеличены (шрифты от 52px до 80px), чтобы контент легко читался на экранах мобильных телефонов и телевизоров.
* **Транскрипция**: Текстовое отображение транскрипции целевого слова на слайдах **отсутствует** (удалено для чистоты дизайна согласно скриншотам сайта).
* **Intro / карточки / quiz visual polish**: production renderer keeps the same LunaCards light-blue / white-card system, but intro uses a denser premium glass panel with a brand pill, localized deck title, localized subtitle pill and framed instruction text. Static and quiz cards use a slightly richer white-card background, larger word hierarchy, stronger chip styling, and a clearer quiz placeholder/answer hierarchy. Visual regression preview is kept at `outputs/tmp/visual-check-intro-card-templates-v2/contact-sheet.jpg`; generated screenshots should show no visible text clipping or overlap.

---

## 3. Спецификации аудио-бурения (Audio & Pause Specifications)

Аудиодорожка строится по методу **Pimsleur (Слушай и повторяй)**. Вся озвучка синтезируется с помощью бесплатного локального движка `edge-tts`.

### Структура таймингов одной карточки:
1. **Озвучка целевого слова (Target Word)**: Звучит слово на изучаемом языке (например, испанский: *la ducha*). На экране видно только испанское слово.
2. **Пауза для повторения (Listen & Repeat)**: Фиксированная пауза **2.0 секунды**. В это время ученик должен повторить слово вслух.
3. **Озвучка перевода (Support Translation)**: Звучит перевод на родной язык ученика (например, русский: *душ*). На экране видно испанское слово + русский перевод.
4. **Пауза для осознания**: Фиксированная пауза **2.5 секунды** перед переходом к следующей карточке.

> [!NOTE]  
> Предложения-примеры были полностью удалены из видео по соображениям педагогики (снижение когнитивной нагрузки на уровне А1) и динамики. Цикл состоит только из `Слово -> Пауза -> Перевод -> Пауза`.

---

## 4. Интерактивный Квиз (Interactive Quiz Segment)

В конце каждого урока добавляется игровой проверочный сегмент:
1. **Экран вопроса**: На экране появляется перевод слова на родной язык (например: *душ*).
2. **Таймер**: Запускается визуальный обратный отсчет (3... 2... 1...) длительностью **3.0 секунды**.
3. **Экран ответа**: По истечении таймера показывается правильное слово на изучаемом языке (*la ducha*) и воспроизводится его аудиозапись.
4. **Пауза перед следующим вопросом**: Фиксированная пауза **2.5 секунды**.

---

## 4.1. Локализация Intro / Outro / Quiz

Тексты intro, outro, quiz labels, feature badges и QR-подписи берутся из:

```text
config/video-localization.json
scripts/generate-video-localization.mjs
```

Outro feature badges use generated premium line-icon PNGs instead of emoji:

```text
assets/video/outro-icons/premium-outro-icons-light-transparent.png
assets/video/outro-icons/split/*.png
scripts/lib/video-outro-icons.mjs
```

Outro feature grid keeps all 8 badges, but the visual hierarchy should stay conversion-focused: subtle glass feature cards, icon wells, a lighter URL pill, and a clean white QR card. Do not turn the feature grid back into heavy button-like cards or emoji badges.

Название колоды и subtitle на intro берутся не из технического `content_sets.set_name`, а из localized Course Metadata:

```text
content_set_localizations.title
content_set_localizations.description
scripts/lib/video-generator.mjs#fetchDeckTitle
scripts/lib/video-generator.mjs#fetchDeckMetadata
```

Для слайда `Title` очищается от финальной точки, потому что `Course Metadata.Title` хранится с sentence punctuation для Google Sheets, а на видео эта точка выглядит как лишний UI-знак. `Description` используется для intro subtitle после удаления повторяющегося `Title`, например `Ингредиенты. Начальный уровень.` превращается в `Начальный уровень · 32 слова`; count label может иметь language-specific форму, например RU `слово` / `слова` / `слов`. Если localized metadata отсутствует, fallback идет в таком порядке: English Course Metadata, затем internal `content_sets.set_name`, затем slug-derived title.

`scripts/generate-video-localization.mjs` является генератором для `config/video-localization.json`. Если меняется локализация, нужно обновлять генератор и затем пересобирать JSON:

```bash
node scripts/generate-video-localization.mjs
```

Перед массовой сборкой видео нужно запускать gate:

```bash
npm run check:video-localization
```

Gate проверяет:

- все support-language entries имеют одинаковый набор ключей;
- `intro_speech_template` содержит `{target_lang}` и `{deck_title}`;
- `quiz_question_label_template` содержит `{current}` и `{total}`;
- `qr_scan_label` заполнен, чтобы QR-подпись не оставалась hardcoded English;
- outro QR не откатывается на homepage: для опубликованных курсов используется `/lang/courses/<site-slug>`, для неопубликованных или неизвестных `set_id` используется `/lang/courses`;
- в локалях с отдельной письменностью нет очевидных чужих Unicode-блоков, например Thai inside Lao/Khmer, Devanagari inside Bengali/Tamil, Cyrillic inside Georgian, Burmese inside Armenian.

Этот gate не заменяет native-speaker review. Он блокирует видимые технические и script-level ошибки, которые напрямую попадают на YouTube-слайды и в TTS.

### Outro QR destination

Outro CTA должен вести на учебные материалы сайта, а не на главную страницу:

```text
config/video-public-course-links.json
scripts/lib/video-public-url.mjs
qrcode npm package
```

Правило fail-closed:

- если `set_id` есть в `publishedCourseSlugBySetId`, QR ведет на localized course page, например `https://flashcardsluna.com/ru/courses/home-kitchen-kitchenware-basics`;
- если `set_id` еще не опубликован на сайте или slug не проверен, QR ведет на localized courses page, например `https://flashcardsluna.com/ru/courses`;
- не выводить URL из `content_sets.slug` автоматически: DB slug и public site slug могут отличаться, а несуществующий dynamic route может выглядеть как HTTP 200 из-за Next.js fallback.
- QR генерируется локально как SVG data URI через `qrcode`; production renderer не должен зависеть от `api.qrserver.com` или заранее сохраненных QR-файлов.

---

## 5. Техническая реализация и оптимизация производительности (Tech Pipeline & Speed Optimizations)

* **Скрипты сборки**:
  - Главный скрипт сборщика: [build-deck-video.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/build-deck-video.mjs)
  - Хелпер синтеза аудио: [video-generator.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/lib/video-generator.mjs)
  - Пакетный генератор скриншотов: [screenshot-batch.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/lib/screenshot-batch.mjs)

Для ускорения генерации одного видеоурока из 50 карточек (563 кадра для анимации 3D-переворота) с ~10 минут до **1–2 минут** внедрен комплекс оптимизаций:

### А. Параллельная предзагрузка озвучки (Parallel TTS Prefetching)
- Перед началом рендеринга видео скрипт парсит всю колоду, вычленяет уникальные тексты для озвучки (целевое слово, перевод, Outro) и отсекает дубликаты.
- Синтез аудио через бесплатный `edge-tts` (обращение к Azure) запускается в параллельном пуле с лимитом конкурентности (8 одновременных запросов). Это нивелирует накладные расходы Windows на запуск процессов Python и ожидания сети.
- Все сгенерированные файлы сохраняются в локальный кэш: [outputs/video-generator/cache/](file:///c:/Users/ramil/Desktop/luna/outputs/video-generator/cache/). Повторные запуски уроков используют 100% локальный кэш (0 секунд на фазу TTS).

### Б. Пакетный рендеринг скриншотов в Playwright
- Вместо поочередного открытия страниц, скрипт запускает Playwright-пул из параллельных виртуальных страниц-воркеров (`screenshot-batch.mjs`). Лимит воркеров ограничен до **4** для предотвращения перегрузки процессора (CPU thrashing) при одновременной сборке двух колод.
- Слайды рендерятся одновременно, что позволяет завершить создание 563 скриншотов высокого разрешения за **~35–45 секунд**.
- Для экономии дисковых операций и ускорения чтения скриншоты сохраняются в формате **JPEG с качеством 98%** (вместо тяжелого PNG), сохраняя идеальную четкость текста.

### В. Аппаратное кодирование видео (Intel QSV Hardware Muxing)
- Сборка видео в FFmpeg переведена с программного кодека `libx264` на аппаратный кодек **Intel QSV** (`-c:v h264_qsv` с пиксельным форматом `nv12` и пресетом `fast`).
- Кодирование полностью переложено на встроенное видеоядро процессора (Intel Iris), снижая нагрузку на CPU до минимума и сокращая время склейки до **10–15 секунд**.

### Г. Особенности производительности на Windows (Фоновый vs Интерактивный режим)
* **Приоритет процессов Windows (CPU & GPU Throttling)**:
  - При запуске сборки вручную в активном окне терминала (Foreground/Interactive) холодная сборка занимает **~2 минуты 15 секунд**.
  - При запуске в качестве фоновой задачи (Background Task/Service) время сборки возрастает до **4–5 минут**. Операционная система Windows автоматически понижает приоритет фоновых процессов для безголовых окон Chromium (Playwright) и кодировщика FFmpeg (Intel QSV), искусственно ограничивая выделяемые им CPU и GPU ресурсы.
* **Накладные расходы на запуск процессов (Process Spawning)**:
  - Скрипт сборщика запускает `ffmpeg` по 2 раза на каждую карточку (всего 100 запусков последовательно) для конвертации скачанных MP3 в WAV (необходимо для получения посемпловой точности длительности аудио).
  - На Windows операция `CreateProcess` является ресурсоемкой и добавляет ~15–20 секунд «чистого» ожидания инициализации исполняемых файлов FFmpeg, в то время как на Linux-системах запуск происходит практически мгновенно.

---

## 6. Визуальные переходы карточек (Card Transition Modes)

Для анимации перехода между показом слова и раскрытием перевода поддерживаются два режима (задаются флагом `--transition`):

### 1. Статический режим (`--transition static` — по умолчанию)
* **Поведение**: Мгновенное переключение состояния карточки.
* **Кадры**:
  1. *Кадр 1*: Карточка по центру показывает только целевое слово.
  2. *Кадр 2*: Карточка мгновенно переключается на состояние с переводом по центру и целевым словом в верхней плашке-теге.

### 2. Режим 3D-переворота (`--transition flip`)
* **Поведение**: Плавный 3D-переворот карточки по оси Y на 180° в стиле реального флип-эффекта.
* **Реализация**:
  * Переворот длится **0.44 секунды** (11 кадров при 25 FPS).
  * Карточка рендерится как двухсторонняя 3D-модель в CSS (`perspective: 1000px`, `backface-visibility: hidden`).
  * Для каждого из 11 кадров скрипт передает конкретный угол поворота (от 0° до 180°), исключая рассинхронизацию времени рендеринга.
  * На отметке 90° (когда карточка расположена ребром к зрителю) происходит невидимая смена содержимого с фронтального (целевое слово) на заднее (перевод + тег целевого слова).

---

## 7. Интеграция с учебниками и правила именования (Textbook Alignment & Naming Rules)

При создании видеоуроков, которые структурированы в соответствии с популярными учебниками для привлечения органического SEO-трафика (например, *Murphy, Genki, Носков*), необходимо соблюдать правила бренда и юридической безопасности:

### А. Формат названий видео
Запрещено использовать прямые утверждения о том, что видео является "официальным курсом" учебника. Названия должны строиться так, чтобы было понятно, что это независимый тренажер:
* **Неправильно:** *«Официальный курс по учебнику Genki Lesson 1»*, *«Английский по Мерфи: Унит 5»*.
* **Правильно:** *«Тренажер к учебнику Genki (Lesson 1) / Грамматика は и です»*, *«Английская грамматика: Present Continuous (в стиле Murphy, Unit 5)»*.

### Б. Обязательный дисклеймер в описании видео
В описание каждого такого видео на YouTube обязательно добавляется сноска:
* **Для русскоязычных видео:** *«LunaCards является независимым образовательным тренажером. Данные материалы разработаны независимо от авторов и издателей оригинального учебника [Название учебника] и не аффилированы с ними».*
* **Для англоязычных видео:** *«LunaCards is an independent educational tool. These practice materials are developed independently and are not affiliated with, sponsored by, or endorsed by the authors or publishers of [Textbook Name].»*

Полные правила и дорожная карта интеграции учебников находятся в [Grammar & Textbook Roadmap](grammar-roadmap.md).

---

## 8. Руководство по самостоятельному запуску пакетной сборки (Bulk Build Guide)

Для удобного пакетного запуска генерации видеоуроков по всем целевым языкам без ручной настройки отдельных процессов разработан автоматический CLI-скрипт: [build-all-deck-videos.mjs](file:///c:/Users/ramil/Desktop/luna/scripts/build-all-deck-videos.mjs).

Скрипт автоматически опрашивает базу данных Prisma для выявления активных языков в системе, запускает рендеринг видеопотоков в параллельном режиме (с заданным лимитом concurrency) и самостоятельно заносит успешные результаты в [Video Lessons Registry](video-lessons-registry.md).

### Требования для запуска:
- Установленный Node.js (версии 18 и выше).
- Наличие файлов ffmpeg в системном PATH (или в папке проекта).
- Настроенное окружение Prisma (`schema.prisma` и подключение к БД).

### Шаги для самостоятельного запуска:
1. Откройте терминал в папке проекта:
   `c:\Users\ramil\Desktop\luna`
2. Выполните команду запуска через Node.js с нужными аргументами.

### Примеры команд:

* **Стандартный запуск для всех активных языков** (колода `home_kitchen_cookware_pilot_01` с поддержкой `RU` в 2 параллельных потока):
  ```bash
  node scripts/build-all-deck-videos.mjs
  ```

* **Ограничение сборки только списком конкретных языков** (полезно, если нужно дорендерить или обновить конкретные видео):
  ```bash
  node scripts/build-all-deck-videos.mjs --targets ES,DE,FR,IT
  ```

* **Настройка параллелизма (concurrency)**:
  - `--concurrency 1` — рендерить языки строго по очереди (минимальная нагрузка на CPU).
  - `--concurrency 2` — рендерить по 2 языка одновременно (оптимально для 8-ядерного CPU на Windows).
  ```bash
  node scripts/build-all-deck-videos.mjs --concurrency 2
  ```

* **Сборка видеоуроков для другой колоды** (через `--set`):
  ```bash
  node scripts/build-all-deck-videos.mjs --set <идентификатор_колоды>
  ```

### Доступные флаги CLI:
| Флаг | Значение по умолчанию | Описание |
|---|---|---|
| `--set` | `home_kitchen_cookware_pilot_01` | Идентификатор колоды в БД. |
| `--support` | `RU` | Язык поддержки (на котором озвучивается перевод). |
| `--concurrency` | `2` | Количество параллельных процессов генерации. |
| `--transition` | `flip` | Анимационный переход (`flip` для 3D-переворота, `static` без анимации). |
| `--quiz-limit` | `3` | Количество карточек в проверочном квизе в конце видео. |
| `--targets` | *нет* | Список целевых языков через запятую. Если опущен — берутся все активные языки из БД. |
