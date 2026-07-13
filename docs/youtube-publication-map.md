# Карта публикаций YouTube

Сформировано: 2026-07-13T16:01:54.813Z

Source of truth: live YouTube API readback через четыре GitHub OAuth route плюс durable registry/calendar comparison. Полный per-video список и точные URL находятся в `config/youtube-publication-snapshot.json`.

> Этот документ не разрешает удаление, повторную загрузку или публикацию. Любой YouTube write требует отдельного preflight и подтверждения.

## Сводка

| Deck | API routes | Live видео | Public | Scheduled | Private без будущей даты | Статус не прочитан | Durable-only | Хвосты ordinary | Хвосты Polyglot full | Live дубли | Registry-only дубли | Calendar blockers | Strict evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `home_kitchen_cooking_actions_a1_a2` | 4/4 | 1230 | 1164 | 66 | 0 | 0 | 0 | 1470 | 204 | 0 | 0 | 0 | yes |
| `home_kitchen_cookware_pilot_01` | 4/4 | 2903 | 2893 | 10 | 0 | 0 | 12 | 18 | 9 | 0 | 0 | 0 | yes |

## Обложки плейлистов

- Подготовлено: 162; файлы существуют: 162; отслеживаются Git: 162.
- Имеют durable playlist ID и могут войти в будущий upload plan: 134; сначала требуют read-only playlist discovery: 28.
- Уже подтверждены durable readback как загруженные: 0; конфликтов manifest/registry playlist ID: 0.
- Наличие файла не разрешает YouTube write: apply требует отдельного подтверждения, точного Git-tracked JPG, playlist ID и свежего route OAuth readback.

| Support | Подготовлено | С playlist ID | Нужен discovery | Git-tracked | Uploaded | ID conflicts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| KA | 54 | 43 | 11 | 54 | 0 | 0 |
| SI | 54 | 46 | 8 | 54 | 0 | 0 |
| UZ | 54 | 45 | 9 | 54 | 0 | 0 |

Без playlist ID: KA=[HY, KK, KM, KN, LO, NO, SL, SR, SV, SW, TA]; SI=[HY, LV, NO, SL, SR, SV, SW, TA]; UZ=[HY, LT, LV, NO, SK, SL, SR, SV, SW].

## home_kitchen_cooking_actions_a1_a2

Live API window: 2026-07-13T14:51:09.776Z .. 2026-07-13T14:51:21.064Z.

GitHub runs:

- all: [29259665438](https://github.com/webpot-ru/luna/actions/runs/29259665438)

### Каналы

| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| AZ | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| BG | 29 | 29 | 0 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | - | - |
| BN | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| CS | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| DA | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| DE | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| EN | 11 | 4 | 7 | 0 | 0 | 0 | 41 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-14T15:30:00Z |
| ES-419 | 11 | 0 | 11 | 0 | 0 | 0 | 41 | 4 | 0 | 0 | 2026-07-15T06:30:00Z | 2026-07-16T18:30:00Z |
| ET | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| FI | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| FR | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| HI | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| HR | 30 | 29 | 1 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-13T15:30:00Z |
| HU | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| HY | 29 | 29 | 0 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | - | - |
| ID | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| IS | 29 | 29 | 0 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | - | - |
| IT | 30 | 29 | 1 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-13T15:30:00Z |
| JA | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| KA | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| KK | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| KM | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| KN | 30 | 28 | 2 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T15:00:00Z | 2026-07-13T18:00:00Z |
| KO | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| LO | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| LT | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| LV | 29 | 29 | 0 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | - | - |
| ML | 30 | 28 | 2 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T15:00:00Z | 2026-07-13T18:00:00Z |
| MS | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| MY | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| NE | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| NL | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| NO | 27 | 24 | 3 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-13T21:30:00Z |
| PL | 25 | 22 | 3 | 0 | 0 | 0 | 28 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-13T21:30:00Z |
| PT-BR | 11 | 0 | 11 | 0 | 0 | 0 | 41 | 4 | 0 | 0 | 2026-07-13T22:30:00Z | 2026-07-15T16:30:00Z |
| RO | 28 | 24 | 4 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T17:30:00Z | 2026-07-14T08:30:00Z |
| RU | 12 | 12 | 0 | 0 | 0 | 0 | 41 | 4 | 0 | 0 | - | - |
| SI | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| SK | 28 | 21 | 7 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-14T15:30:00Z |
| SL | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| SR | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| SV | 25 | 21 | 4 | 0 | 0 | 0 | 28 | 4 | 0 | 0 | 2026-07-13T15:30:00Z | 2026-07-14T06:30:00Z |
| SW | 28 | 28 | 0 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | - | - |
| TA | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| TE | 30 | 28 | 2 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T15:00:00Z | 2026-07-13T18:00:00Z |
| TH | 28 | 24 | 4 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T16:30:00Z | 2026-07-14T07:30:00Z |
| TL | 26 | 26 | 0 | 0 | 0 | 0 | 27 | 4 | 0 | 0 | - | - |
| TR | 9 | 9 | 0 | 0 | 0 | 0 | 44 | 4 | 0 | 0 | - | - |
| UZ | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| VI | 28 | 24 | 4 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T16:30:00Z | 2026-07-14T07:30:00Z |
| ZH | 8 | 8 | 0 | 0 | 0 | 0 | 45 | 4 | 0 | 0 | - | - |

### Дубли

- Не обнаружены.

### Хвосты

- AZ: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- BG: ordinary 24 [MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- BN: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- CS: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- DA: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- DE: ordinary 40 [HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- EN: ordinary 41 [HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ES-419: ordinary 41 [HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ET: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- FI: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- FR: ordinary 40 [HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HI: ordinary 40 [HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HR: ordinary 23 [MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HU: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HY: ordinary 24 [MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ID: ordinary 40 [HI, HR, HU, HY, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- IS: ordinary 24 [MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- IT: ordinary 23 [MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- JA: ordinary 40 [HI, HR, HU, HY, ID, IS, IT, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KA: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KK: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KM: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KN: ordinary 23 [MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KO: ordinary 40 [HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LO: ordinary 26 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LT: ordinary 26 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LV: ordinary 24 [MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ML: ordinary 23 [MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- MS: ordinary 25 [LV, ML, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- MY: ordinary 26 [LT, LV, ML, MS, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- NE: ordinary 25 [LV, ML, MS, MY, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- NL: ordinary 25 [LV, ML, MS, MY, NE, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- NO: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- PL: ordinary 28 [KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- PT-BR: ordinary 41 [FI, FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- RO: ordinary 25 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- RU: ordinary 41 [FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SI: ordinary 25 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SK: ordinary 25 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SL: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SR: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SV: ordinary 28 [KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SW: ordinary 25 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TA: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TE: ordinary 23 [MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TH: ordinary 25 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TL: ordinary 27 [LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TR: ordinary 44 [ES-419, ET, FI, FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- UZ: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- VI: ordinary 25 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ZH: ordinary 45 [ES, ES-419, ET, FI, FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].

## home_kitchen_cookware_pilot_01

Live API window: 2026-07-13T16:00:21.112Z .. 2026-07-13T16:00:22.385Z.

GitHub runs:

- all: [29264567055](https://github.com/webpot-ru/luna/actions/runs/29264567055)

### Каналы

| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| AZ | 57 | 57 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | - | - |
| BG | 55 | 55 | 0 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | - | - |
| BN | 57 | 57 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | - | - |
| CS | 56 | 56 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | - | - |
| DA | 52 | 52 | 0 | 0 | 0 | 0 | 5 | 1 | 0 | 0 | - | - |
| DE | 58 | 58 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | - | - |
| EN | 56 | 56 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | - | - |
| ES-419 | 59 | 51 | 8 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2026-07-13T18:30:00Z | 2026-07-14T21:30:00Z |
| ET | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| FI | 57 | 57 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | - | - |
| FR | 58 | 58 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | - | - |
| HI | 58 | 58 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | - | - |
| HR | 55 | 55 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | - | - |
| HU | 57 | 57 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | - | - |
| HY | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| ID | 58 | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| IS | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| IT | 57 | 57 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | - | - |
| JA | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | - | - |
| KA | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KK | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KM | 57 | 57 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | - | - |
| KN | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KO | 58 | 58 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | - | - |
| LO | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| LT | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| LV | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| ML | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| MS | 57 | 57 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | - | - |
| MY | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| NE | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| NL | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| NO | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| PL | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| PT-BR | 58 | 56 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2026-07-13T16:30:00Z | 2026-07-13T19:30:00Z |
| RO | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| RU | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SI | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SK | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SL | 56 | 56 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | - | - |
| SR | 57 | 57 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | - | - |
| SV | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SW | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TA | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TE | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TH | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TL | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TR | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| UZ | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| VI | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| ZH | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | - | - |

### Дубли

- Не обнаружены.

### Хвосты

- AZ: ordinary 1 [NO]; Polyglot full 0.
- BG: ordinary 1 [NO]; Polyglot full 0.
- BN: ordinary 1 [NO]; Polyglot full 1 [global_europe_core].
- CS: ordinary 1 [NO]; Polyglot full 1 [global_europe_core].
- DA: ordinary 5 [HR, HU, ID, JA, NO]; Polyglot full 1 [global_europe_core].
- DE: ordinary 1 [NO]; Polyglot full 0.
- FI: ordinary 1 [NO]; Polyglot full 0.
- FR: ordinary 1 [NO]; Polyglot full 1 [romance_core].
- HI: ordinary 1 [NO]; Polyglot full 0.
- HR: ordinary 1 [NO]; Polyglot full 0.
- HU: ordinary 1 [NO]; Polyglot full 0.
- IT: ordinary 1 [NO]; Polyglot full 1 [romance_core].
- JA: ordinary 0; Polyglot full 1 [east_asia_core].
- KO: ordinary 0; Polyglot full 1 [east_asia_core].
- SL: ordinary 1 [NO]; Polyglot full 1 [global_europe_core].
- SR: ordinary 1 [NO]; Polyglot full 0.
- ZH: ordinary 0; Polyglot full 1 [east_asia_core].

## Нераспознанные загрузки

- Всего в uploads-плейлистах, но без подтвержденной продуктовой identity: 201.
- Свежих неразобранных блокеров apply: 0.
- videos.list не вернул статус: 131.
- Полный точный список, ID, URL и статус находятся в верхнеуровневом `unclassifiedUploads` файла `config/youtube-publication-snapshot.json`.

По каналам: AZ=4, BG=3, BN=3, CS=3, DA=3, DE=5, EN=70, ET=4, FI=3, FR=4, HI=4, HR=4, HU=3, HY=2, ID=3, IS=4, IT=4, KA=4, KK=3, KM=3, KN=4, KO=4, LO=3, LT=4, LV=4, ML=3, MS=2, NL=3, NO=2, PL=4, RO=4, SI=3, SK=4, SL=2, SV=4, TA=3, TE=3, TL=3, UZ=2, ZH=4.
