# Windows Handover & Setup Specification

Этот документ предназначен для быстрого развертывания проекта LunaCards и продолжения сборки видеоуроков на компьютере под управлением **Windows**. 

Когда вы откроете этот проект в новом чате с AI-ассистентом на Windows-компьютере, просто отправьте ему сообщение: 
> «Прочитай docs/windows-handover-spec.md и выполни инструкции по продолжению работы.»

---

## 1. Подготовка окружения на Windows (Setup Requirements)

Перед запуском скриптов на Windows необходимо убедиться, что установлены следующие зависимости:

1. **Node.js (v18+)**
   * Скачать и установить с официального сайта: [nodejs.org](https://nodejs.org/).
2. **Git**
   * Скачать и установить: [git-scm.com](https://git-scm.com/).
3. **FFmpeg (Критично для Windows!)**
   * В отличие от macOS, на Windows FFmpeg нужно устанавливать вручную.
   * **Инструкция по установке:**
     1. Скачайте сборку для Windows (например, с [ffmpeg.org](https://ffmpeg.org/) или через gyan.dev).
     2. Распакуйте архив в удобное место (например, `C:\ffmpeg`).
     3. Добавьте путь к папке `bin` (например, `C:\ffmpeg\bin`) в системную переменную окружения **PATH**.
     4. Перезапустите терминал и проверьте работу команды:
        ```cmd
        ffmpeg -version
        ```
4. **PostgreSQL (Два варианта настройки базы данных):**
   * **Вариант А: Подключение к Mac по домашней сети (Самый простой)**
     * Если компьютеры в одном Wi-Fi/роутере, запустите БД на Mac в Docker.
     * Найдите IP-адрес Mac в сети (например, `192.168.1.50`).
     * В файле `.env.local` на Windows укажите IP мака вместо `127.0.0.1`:
       ```env
       DATABASE_URL=postgresql://lunacards:lunacards@<IP_АДРЕС_МАКА>:55433/lunacards
       ```
   * **Вариант Б: Локальный Docker Postgres на Windows (Автономный)**
     * Установите **Docker Desktop** на Windows.
     * Запустите контейнер Postgres из корня проекта: `docker-compose up -d`
     * Готовый дамп базы данных уже прикреплен в архиве по пути: `db/lunacards_dump.sql`.
     * Восстановите этот дамп в локальный контейнер с помощью команды в PowerShell:
       ```powershell
       docker exec -i lunacards-postgres-1 psql -U lunacards -d lunacards < db/lunacards_dump.sql
       ```
     * Убедитесь, что в `.env.local` на Windows указан локальный хост:
       ```env
       DATABASE_URL=postgresql://lunacards:lunacards@127.0.0.1:55433/lunacards
       ```

---

## 2. Пошаговый запуск проекта на Windows

Выполните в папке проекта следующие команды:

```powershell
# 1. Установка Node-зависимостей
npm install

# 2. Установка браузера Chromium для Playwright (скриншотера)
npx playwright install chromium
```

---

## 3. Инструкция для нового AI-ассистента (Prompt for the new Agent)

Копируйте и отправьте этот текст новому AI-ассистенту:

> **ВНИМАНИЕ, АГЕНТ:** Ты продолжаешь задачу по сборке видеоуроков LunaCards для колоды `home_bathroom_essentials_a1` (поддержка `RU`, 53 целевых языка). 
>
> **Текущий статус:**
> * Код сборщика [build-deck-video.mjs](file:///./scripts/build-deck-video.mjs) и скриншотера [screenshot-batch.mjs](file:///./scripts/lib/screenshot-batch.mjs) оптимизирован: рендеринг работает в многопоточном режиме (до 8 вкладок параллельно) через динамический DOM-рендеринг в памяти Chrome без перезагрузок.
> * Тестовая сборка на macOS успешно проверена для испанского языка (`ES`) и заняла всего 3.9 минуты.
> * База данных — PostgreSQL. Ссылка на подключение берется из `.env.local`.
>
> **Твоя задача:**
> 1. Проверь наличие установленного FFmpeg и доступность Postgres, запустив тестовую сборку:
>    ```bash
>    node scripts/build-deck-video.mjs --set home_bathroom_essentials_a1 --target ES --quiz-limit 3 --transition flip
>    ```
> 2. Если тест прошел успешно, проверь реестр [video-lessons-registry.md](file:///./docs/video-lessons-registry.md) для определения языков со статусом `Pending` или отсутствующих файлов в `outputs/video-generator/`.
> 3. При необходимости запусти фоновый скрипт или скомпилируй оставшиеся языки по очереди.
