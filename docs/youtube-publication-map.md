# Карта публикаций YouTube

Сформировано: 2026-07-18T15:29:09.883Z

Source of truth: live YouTube API readback через четыре GitHub OAuth route плюс durable registry/calendar comparison. Полный per-video список и точные URL находятся в `config/youtube-publication-snapshot.json`.

> Этот документ не разрешает удаление, повторную загрузку или публикацию. Любой YouTube write требует отдельного preflight и подтверждения.

## Сводка

| Deck | API routes | Live видео | Public | Scheduled | Private без будущей даты | Статус не прочитан | Durable-only | Хвосты ordinary | Хвосты Polyglot full | Live дубли | Registry-only дубли | Calendar blockers | Strict evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `home_kitchen_cooking_actions_a1_a2` | 4/4 | 2078 | 2061 | 17 | 0 | 0 | 0 | 734 | 93 | 0 | 0 | 0 | yes |

## Обложки плейлистов

- Подготовлено: 162; файлы существуют: 162; отслеживаются Git: 162.
- Имеют durable playlist ID и могут войти в будущий upload plan: 144; сначала требуют read-only playlist discovery: 18.
- Уже подтверждены durable readback как загруженные: 0; конфликтов manifest/registry playlist ID: 0.
- Наличие файла не разрешает YouTube write: apply требует отдельного подтверждения, точного Git-tracked JPG, playlist ID и свежего route OAuth readback.

| Support | Подготовлено | С playlist ID | Нужен discovery | Git-tracked | Uploaded | ID conflicts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| KA | 54 | 46 | 8 | 54 | 0 | 0 |
| SI | 54 | 50 | 4 | 54 | 0 | 0 |
| UZ | 54 | 48 | 6 | 54 | 0 | 0 |

Без playlist ID: KA=[HY, KK, KM, KN, LO, SV, SW, TA]; SI=[HY, SV, SW, TA]; UZ=[HY, SK, SL, SR, SV, SW].

## home_kitchen_cooking_actions_a1_a2

Live API window: 2026-07-18T13:02:14.682Z .. 2026-07-18T13:02:20.580Z.

GitHub runs:

- all: [29645382620](https://github.com/webpot-ru/luna/actions/runs/29645382620)

### Каналы

| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| AZ | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| BG | 44 | 44 | 0 | 0 | 0 | 0 | 11 | 2 | 0 | 0 | - | - |
| BN | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| CS | 43 | 43 | 0 | 0 | 0 | 0 | 13 | 1 | 0 | 0 | - | - |
| DA | 46 | 44 | 2 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | 2026-07-18T15:30:00Z | 2026-07-18T18:30:00Z |
| DE | 30 | 30 | 0 | 0 | 0 | 0 | 25 | 2 | 0 | 0 | - | - |
| EN | 28 | 28 | 0 | 0 | 0 | 0 | 26 | 2 | 0 | 0 | - | - |
| ES-419 | 28 | 20 | 8 | 0 | 0 | 0 | 26 | 2 | 0 | 0 | 2026-07-18T15:30:00Z | 2026-07-19T18:30:00Z |
| ET | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| FI | 46 | 46 | 0 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | - | - |
| FR | 30 | 30 | 0 | 0 | 0 | 0 | 25 | 2 | 0 | 0 | - | - |
| HI | 30 | 30 | 0 | 0 | 0 | 0 | 25 | 2 | 0 | 0 | - | - |
| HR | 47 | 47 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 0 | - | - |
| HU | 46 | 46 | 0 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | - | - |
| HY | 39 | 39 | 0 | 0 | 0 | 0 | 14 | 4 | 0 | 0 | - | - |
| ID | 30 | 30 | 0 | 0 | 0 | 0 | 25 | 2 | 0 | 0 | - | - |
| IS | 46 | 46 | 0 | 0 | 0 | 0 | 9 | 2 | 0 | 0 | - | - |
| IT | 46 | 46 | 0 | 0 | 0 | 0 | 8 | 3 | 0 | 0 | - | - |
| JA | 30 | 30 | 0 | 0 | 0 | 0 | 25 | 2 | 0 | 0 | - | - |
| KA | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| KK | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| KM | 45 | 44 | 1 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | 2026-07-18T13:30:00Z | 2026-07-18T13:30:00Z |
| KN | 47 | 47 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 0 | - | - |
| KO | 30 | 30 | 0 | 0 | 0 | 0 | 25 | 2 | 0 | 0 | - | - |
| LO | 44 | 43 | 1 | 0 | 0 | 0 | 11 | 2 | 0 | 0 | 2026-07-18T13:30:00Z | 2026-07-18T13:30:00Z |
| LT | 44 | 44 | 0 | 0 | 0 | 0 | 11 | 2 | 0 | 0 | - | - |
| LV | 46 | 46 | 0 | 0 | 0 | 0 | 9 | 2 | 0 | 0 | - | - |
| ML | 47 | 47 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 0 | - | - |
| MS | 46 | 46 | 0 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | - | - |
| MY | 44 | 43 | 1 | 0 | 0 | 0 | 11 | 2 | 0 | 0 | 2026-07-18T14:00:00Z | 2026-07-18T14:00:00Z |
| NE | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| NL | 46 | 46 | 0 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | - | - |
| NO | 40 | 40 | 0 | 0 | 0 | 0 | 16 | 1 | 0 | 0 | - | - |
| PL | 43 | 43 | 0 | 0 | 0 | 0 | 13 | 1 | 0 | 0 | - | - |
| PT-BR | 28 | 26 | 2 | 0 | 0 | 0 | 26 | 2 | 0 | 0 | 2026-07-18T13:30:00Z | 2026-07-18T16:30:00Z |
| RO | 46 | 46 | 0 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | - | - |
| RU | 29 | 29 | 0 | 0 | 0 | 0 | 26 | 2 | 0 | 0 | - | - |
| SI | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| SK | 46 | 46 | 0 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | - | - |
| SL | 35 | 35 | 0 | 0 | 0 | 0 | 20 | 2 | 0 | 0 | - | - |
| SR | 44 | 44 | 0 | 0 | 0 | 0 | 11 | 2 | 0 | 0 | - | - |
| SV | 43 | 43 | 0 | 0 | 0 | 0 | 13 | 2 | 0 | 0 | - | - |
| SW | 45 | 45 | 0 | 0 | 0 | 0 | 10 | 2 | 0 | 0 | - | - |
| TA | 44 | 44 | 0 | 0 | 0 | 0 | 11 | 2 | 0 | 0 | - | - |
| TE | 47 | 47 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 0 | - | - |
| TH | 46 | 45 | 1 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | 2026-07-18T13:30:00Z | 2026-07-18T13:30:00Z |
| TL | 43 | 43 | 0 | 0 | 0 | 0 | 12 | 2 | 0 | 0 | - | - |
| TR | 26 | 26 | 0 | 0 | 0 | 0 | 29 | 2 | 0 | 0 | - | - |
| UZ | 39 | 39 | 0 | 0 | 0 | 0 | 16 | 2 | 0 | 0 | - | - |
| VI | 46 | 45 | 1 | 0 | 0 | 0 | 10 | 1 | 0 | 0 | 2026-07-18T13:30:00Z | 2026-07-18T13:30:00Z |
| ZH | 25 | 25 | 0 | 0 | 0 | 0 | 30 | 2 | 0 | 0 | - | - |

### Дубли

- Не обнаружены.

### Хвосты

- AZ: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- BG: ordinary 11 [SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- BN: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- CS: ordinary 13 [PT, PT-BR, RO, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- DA: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- DE: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- EN: ordinary 26 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- ES-419: ordinary 26 [LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- ET: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- FI: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- FR: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- HI: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- HR: ordinary 8 [TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- HU: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- HY: ordinary 14 [PL, PT, PT-BR, RO, RU, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ID: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- IS: ordinary 9 [SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- IT: ordinary 8 [TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, east_asia_core, slavic_core].
- JA: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- KA: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- KK: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- KM: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- KN: ordinary 8 [TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- KO: ordinary 25 [ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- LO: ordinary 11 [SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- LT: ordinary 11 [SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- LV: ordinary 9 [SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- ML: ordinary 8 [TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- MS: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- MY: ordinary 11 [SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- NE: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- NL: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- NO: ordinary 16 [NE, NL, PL, PT, PT-BR, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- PL: ordinary 13 [SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- PT-BR: ordinary 26 [LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- RO: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- RU: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- SI: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- SK: ordinary 10 [SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- SL: ordinary 20 [NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- SR: ordinary 11 [SL, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- SV: ordinary 13 [SI, SK, SL, SR, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- SW: ordinary 10 [SR, SV, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- TA: ordinary 11 [SL, SR, SV, SW, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- TE: ordinary 8 [SW, TA, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- TH: ordinary 10 [SR, SV, SW, TA, TE, TL, TR, UZ, VI, ZH]; Polyglot full 1 [slavic_core].
- TL: ordinary 12 [SK, SL, SR, SV, SW, TA, TE, TH, TR, UZ, VI, ZH]; Polyglot full 2 [romance_core, slavic_core].
- TR: ordinary 29 [KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, UZ, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- UZ: ordinary 16 [PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, VI, ZH]; Polyglot full 2 [east_asia_core, slavic_core].
- VI: ordinary 10 [SR, SV, SW, TA, TE, TH, TL, TR, UZ, ZH]; Polyglot full 1 [slavic_core].
- ZH: ordinary 30 [KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI]; Polyglot full 2 [east_asia_core, slavic_core].

## Нераспознанные загрузки

- Всего в uploads-плейлистах, но без подтвержденной продуктовой identity: 94.
- Свежих неразобранных блокеров apply: 0.
- videos.list не вернул статус: 25.
- Полный точный список, ID, URL и статус находятся в верхнеуровневом `unclassifiedUploads` файла `config/youtube-publication-snapshot.json`.

По каналам: AZ=1, BG=1, BN=1, CS=1, DA=1, EN=69, ET=1, FI=1, FR=1, HR=3, HU=1, HY=1, ID=1, IS=1, IT=1, KA=1, KK=1, KN=1, LO=1, LT=1, LV=1, ML=1, NL=1, NO=1.
