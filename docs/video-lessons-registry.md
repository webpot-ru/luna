# Video Lessons Registry

Этот документ является реестром сгенерированных видеоуроков LunaCards. Он используется для отслеживания дат сборки, параметров компиляции и сохранения ссылок на опубликованные ролики на YouTube.

Статус: **Source of Truth для реестра видеоуроков**.

Важно: этот Markdown-документ является **человеческим реестром видео**, а не machine-readable ledger для YouTube upload/playlist automation. Историческая таблица ниже может содержать повторные pending-строки и рабочие записи по одному и тому же `set_id` / языковой паре; из нее нельзя напрямую создавать плейлисты, загружать видео или делать `playlistItems.insert`.

Accepted playlist/upload contract lives in [Video Lessons Strategy - Playlist architecture](video-lessons-strategy.md#13-playlist-architecture). Future automation must use structured files:

```text
config/youtube-channels.json
config/youtube-playlists.json
outputs/youtube-publish-ledger.jsonl
```

The structured ledger must store stable `playlist_key`, `youtube_video_id`, `youtube_playlist_id`, `playlistItemId`, privacy/status, timestamp and readback result. This Markdown registry can summarize or link to those facts after readback, but it must not be the only state used for idempotent YouTube API writes.

2026-06-19 fresh-run note: `home_kitchen_cookware_pilot_01` is being restarted as the first clean video batch. Existing rows below for this `set_id` from 2026-06-14 / 2026-06-15 and earlier GitHub/local video artifacts are historical working evidence only. Do not use them as current publish readiness, playlist membership, or upload state. The fresh rerun should append new current rows/readback instead of treating old `Pending` rows as active state.

---

## Реестр видеоуроков (Video Registry)

| № | Колода / Set ID | Название | Язык (Target) | Поддержка (Support) | Дата сборки | Параметры сборки | Статус публикации | Ссылка на YouTube |
|---|---|---|---|---|---|---|---|---|
| 1 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ES | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 2 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | IT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 3 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 4 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 5 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | BN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 6 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | CS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 7 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | DA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 8 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | DE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 9 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | EN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 10 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | EN-GB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 11 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ES-419 | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 12 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ET | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 13 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | FI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 14 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | FR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 15 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 16 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 17 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HU | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 18 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | HY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 19 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | IS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 20 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ID | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 21 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | JA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 22 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 23 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 24 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KM | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 25 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 26 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | KO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 27 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | LO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 28 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | LT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 29 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | LV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 30 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ML | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 31 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | MY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 32 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | MS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 33 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | NE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 34 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | NB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 35 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | PL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 36 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | NL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 37 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | PT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 38 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | PT-BR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 39 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 40 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | RO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 41 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 42 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 43 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 44 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 45 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | SW | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 46 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 47 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 48 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 49 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 50 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | TR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 51 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | UZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 52 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | VI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 53 | `home_kitchen_cookware_pilot_01` | Посуда и приборы | ZH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 54 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 55 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 56 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 57 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 58 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 59 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 60 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 61 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 62 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 63 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 64 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 65 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 66 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 67 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 68 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 69 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 70 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 71 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 72 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 73 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 74 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 75 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 76 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 77 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 78 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 79 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 80 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 81 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 82 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 83 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 84 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 85 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 86 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 87 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 88 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | CS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 89 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 90 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN-GB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 91 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 92 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 93 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 94 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 95 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 96 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 97 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 98 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 99 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 100 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 101 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 102 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 103 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 104 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 105 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 106 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 107 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 108 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 109 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 110 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 111 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 112 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 113 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 114 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 115 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 116 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 117 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT-BR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 118 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RO | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 119 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 120 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SK | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 121 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 122 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 123 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SV | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 124 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SW | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 125 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TA | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 126 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TE | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 127 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 128 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TL | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 129 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TR | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 130 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | UZ | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 131 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | VI | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 132 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ZH | RU | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 133 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 134 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 135 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 136 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | CS | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 137 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 138 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 139 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN-GB | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 140 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 141 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 142 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 143 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 144 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 145 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 146 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 147 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 148 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HY | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 149 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 150 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 151 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 152 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 153 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 154 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 155 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 156 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 157 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 158 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 159 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 160 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 161 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 162 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 163 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 164 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 165 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 166 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 167 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 168 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 169 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT-BR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 170 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RO | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 171 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RU | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 172 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 173 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SK | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 174 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 175 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 176 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SV | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 177 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SW | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 178 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TA | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 179 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TE | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 180 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TH | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 181 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TL | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 182 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TR | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 183 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | UZ | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 184 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | VI | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 185 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ZH | EN | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 186 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | AZ | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 187 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BG | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 188 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | BN | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 189 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | CS | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 190 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 191 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 192 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 193 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | EN-GB | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 194 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ES-419 | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 195 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ET | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 196 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 197 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 198 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 199 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 200 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HU | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 201 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | HY | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 202 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ID | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 203 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IS | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 204 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | IT | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 205 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | JA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 206 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 207 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KK | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 208 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 209 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KN | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 210 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KO | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 211 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LO | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 212 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LT | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 213 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | LV | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 214 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ML | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 215 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MS | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 216 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | MY | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 217 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NB | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 218 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NE | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 219 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | NL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 220 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 221 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 222 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | PT-BR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 223 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RO | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 224 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | RU | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 225 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 226 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SK | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 227 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 228 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 229 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SV | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 230 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | SW | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 231 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TA | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 232 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TE | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 233 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TH | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 234 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TL | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 235 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | TR | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 236 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | UZ | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 237 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | VI | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 238 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | ZH | ES | 2026-06-14 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 239 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DA | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 240 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | DE | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 241 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | FI | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 242 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KA | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |
| 243 | `home_kitchen_cookware_pilot_01` | Kitchen Cookware | KM | RU | 2026-06-15 | `--transition flip --quiz-limit 3` | `Pending` | *Ожидает публикации* |

---

## Инструкция по обновлению реестра

1. **После генерации видео**:
   * Разработчик (или AI-ассистент) добавляет новую запись в таблицу с датой сборки, параметрами компиляции и статусом `Pending`.
2. **После публикации на YouTube**:
   * Пользователь (или разработчик) меняет статус на `Published` и вставляет прямую ссылку на видео в колонку «Ссылка на YouTube».
3. **Для плейлистов и массовой публикации**:
   * Не использовать эту Markdown-таблицу как источник истины для API-действий.
   * Сначала выполнить dry-run playlist planner по правилам `docs/video-lessons-strategy.md#13-playlist-architecture`.
   * Для каждого видео должен быть stable `playlist_key` или explicit `playlist_excluded_reason`.
   * Создание плейлистов, загрузка видео, установка thumbnail и добавление в playlist должны писать machine-readable readback в `outputs/youtube-publish-ledger.jsonl`.
   * После readback можно вручную или автоматически обновить этот human registry краткой строкой статуса.
