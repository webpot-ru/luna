# Карта публикаций YouTube

Сформировано: 2026-07-27T10:50:39.025Z

Source of truth: live YouTube API readback через выбранные GitHub OAuth routes плюс durable registry/calendar comparison. Полный per-video список и точные URL находятся в `config/youtube-publication-snapshot.json`.

> Этот документ не разрешает удаление, повторную загрузку или публикацию. Любой YouTube write требует отдельного preflight и подтверждения.

## Сводка

| Deck | API routes | Live видео | Public | Scheduled | Private без будущей даты | Статус не прочитан | Durable-only | Хвосты ordinary | Хвосты Polyglot full | Live дубли | Registry-only дубли | Calendar blockers | Strict evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `home_kitchen_storage_cleaning_a2` | 8/8 | 938 | 835 | 103 | 0 | 0 | 0 | 1883 | 151 | 0 | 0 | 0 | yes |

## Обложки плейлистов

- Подготовлено: 162; файлы существуют: 162; отслеживаются Git: 162.
- Имеют durable playlist ID и могут войти в будущий upload plan: 156; сначала требуют read-only playlist discovery: 6.
- Уже подтверждены durable readback как загруженные: 0; конфликтов manifest/registry playlist ID: 0.
- Наличие файла не разрешает YouTube write: apply требует отдельного подтверждения, точного Git-tracked JPG, playlist ID и свежего route OAuth readback.

| Support | Подготовлено | С playlist ID | Нужен discovery | Git-tracked | Uploaded | ID conflicts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| KA | 54 | 49 | 5 | 54 | 0 | 0 |
| SI | 54 | 54 | 0 | 54 | 0 | 0 |
| UZ | 54 | 53 | 1 | 54 | 0 | 0 |

Без playlist ID: KA=[HY, KK, KM, KN, LO]; UZ=[HY].

## home_kitchen_storage_cleaning_a2

Live API window: 2026-07-27T10:48:35.805Z .. 2026-07-27T10:48:53.982Z.

GitHub runs:

- youtube-1,youtube-2,youtube-3,youtube-4,youtube-5,youtube-6,youtube-7,youtube-8: [30259396122](https://github.com/webpot-ru/luna/actions/runs/30259396122)

### Каналы

| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| AZ | 18 | 18 | 0 | 0 | 0 | 0 | 37 | 4 | 0 | 0 | - | - |
| BG | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T17:30:00Z |
| BN | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T11:30:00Z |
| CS | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T12:30:00Z |
| DA | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T12:30:00Z |
| DE | 13 | 12 | 1 | 0 | 0 | 0 | 42 | 4 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T12:30:00Z |
| EN | 13 | 11 | 2 | 0 | 0 | 0 | 41 | 2 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T15:30:00Z |
| ES-419 | 13 | 7 | 6 | 0 | 0 | 0 | 41 | 2 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-28T09:30:00Z |
| ET | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T17:30:00Z |
| FI | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T11:30:00Z |
| FR | 12 | 12 | 0 | 0 | 0 | 0 | 43 | 4 | 0 | 0 | - | - |
| HI | 12 | 12 | 0 | 0 | 0 | 0 | 43 | 4 | 0 | 0 | - | - |
| HR | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| HU | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T12:30:00Z |
| HY | 16 | 15 | 1 | 0 | 0 | 0 | 37 | 4 | 0 | 0 | 2026-07-27T13:30:00Z | 2026-07-27T13:30:00Z |
| ID | 12 | 12 | 0 | 0 | 0 | 0 | 43 | 4 | 0 | 0 | - | - |
| IS | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T11:30:00Z |
| IT | 18 | 18 | 0 | 0 | 0 | 0 | 37 | 4 | 0 | 0 | - | - |
| JA | 12 | 11 | 1 | 0 | 0 | 0 | 43 | 2 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T11:30:00Z |
| KA | 18 | 18 | 0 | 0 | 0 | 0 | 37 | 2 | 0 | 0 | - | - |
| KK | 18 | 18 | 0 | 0 | 0 | 0 | 37 | 4 | 0 | 0 | - | - |
| KM | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T13:30:00Z | 2026-07-27T13:30:00Z |
| KN | 21 | 19 | 2 | 0 | 0 | 0 | 35 | 3 | 0 | 0 | 2026-07-27T12:00:00Z | 2026-07-27T15:00:00Z |
| KO | 12 | 12 | 0 | 0 | 0 | 0 | 43 | 4 | 0 | 0 | - | - |
| LO | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T13:30:00Z | 2026-07-27T13:30:00Z |
| LT | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T17:30:00Z |
| LV | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T17:30:00Z |
| ML | 21 | 19 | 2 | 0 | 0 | 0 | 35 | 3 | 0 | 0 | 2026-07-27T12:00:00Z | 2026-07-27T15:00:00Z |
| MS | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-28T00:30:00Z |
| MY | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 2 | 0 | 0 | 2026-07-27T11:00:00Z | 2026-07-27T11:00:00Z |
| NE | 21 | 19 | 2 | 0 | 0 | 0 | 35 | 1 | 0 | 0 | 2026-07-27T11:45:00Z | 2026-07-27T14:45:00Z |
| NL | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| NO | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| PL | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| PT-BR | 12 | 10 | 2 | 0 | 0 | 0 | 42 | 2 | 0 | 0 | 2026-07-27T13:30:00Z | 2026-07-27T16:30:00Z |
| RO | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T11:30:00Z |
| RU | 12 | 9 | 3 | 0 | 0 | 0 | 43 | 2 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-27T17:30:00Z |
| SI | 21 | 19 | 2 | 0 | 0 | 0 | 35 | 1 | 0 | 0 | 2026-07-27T12:00:00Z | 2026-07-27T15:00:00Z |
| SK | 19 | 18 | 1 | 0 | 0 | 0 | 36 | 4 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T12:30:00Z |
| SL | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| SR | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 1 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| SV | 22 | 19 | 3 | 0 | 0 | 0 | 34 | 3 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-27T18:30:00Z |
| SW | 18 | 18 | 0 | 0 | 0 | 0 | 37 | 2 | 0 | 0 | - | - |
| TA | 21 | 17 | 4 | 0 | 0 | 0 | 35 | 3 | 0 | 0 | 2026-07-27T12:00:00Z | 2026-07-28T03:00:00Z |
| TE | 21 | 17 | 4 | 0 | 0 | 0 | 35 | 3 | 0 | 0 | 2026-07-27T12:00:00Z | 2026-07-28T03:00:00Z |
| TH | 22 | 20 | 2 | 0 | 0 | 0 | 34 | 1 | 0 | 0 | 2026-07-27T13:30:00Z | 2026-07-27T16:30:00Z |
| TL | 18 | 14 | 4 | 0 | 0 | 0 | 37 | 4 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-28T03:30:00Z |
| TR | 12 | 6 | 6 | 0 | 0 | 0 | 43 | 2 | 0 | 0 | 2026-07-27T11:30:00Z | 2026-07-28T08:30:00Z |
| UZ | 18 | 14 | 4 | 0 | 0 | 0 | 37 | 2 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-28T03:30:00Z |
| VI | 22 | 20 | 2 | 0 | 0 | 0 | 34 | 1 | 0 | 0 | 2026-07-27T13:30:00Z | 2026-07-27T16:30:00Z |
| ZH | 18 | 12 | 6 | 0 | 0 | 0 | 38 | 1 | 0 | 0 | 2026-07-27T12:30:00Z | 2026-07-28T09:30:00Z |

### Дубли

- Не обнаружены.

### Хвосты

- AZ: ordinary 37 [EN-GB, ES, ES-419, ET, FI, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- BG: ordinary 34 [ES-419, ET, FI, FR, HI, KM, KN, LO, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- BN: ordinary 36 [EN-GB, ES, ES-419, ET, FI, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- CS: ordinary 36 [EN-GB, ES, ES-419, ET, FI, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- DA: ordinary 36 [EN-GB, ES, ES-419, ET, FI, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- DE: ordinary 42 [AZ, BG, BN, CS, DA, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- EN: ordinary 41 [AZ, BG, BN, CS, DA, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- ES-419: ordinary 41 [AZ, BG, BN, CS, DA, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- ET: ordinary 34 [ES, ES-419, FI, FR, HI, KM, KN, LO, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- FI: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- FR: ordinary 43 [AZ, BG, BN, CS, DA, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HI: ordinary 43 [AZ, BG, BN, CS, DA, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HR: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- HU: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HY: ordinary 37 [EN, EN-GB, ES, ES-419, ET, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ID: ordinary 43 [AZ, BG, BN, CS, DA, HU, HY, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- IS: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- IT: ordinary 37 [EN, EN-GB, ES, ES-419, ET, HY, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- JA: ordinary 43 [AZ, BG, BN, CS, DA, HU, HY, ID, IS, IT, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- KA: ordinary 37 [EN, EN-GB, ES, ES-419, ET, HY, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- KK: ordinary 37 [EN, EN-GB, ES, ES-419, ET, HY, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KM: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KK, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KN: ordinary 35 [ES, ES-419, ET, FI, FR, KK, KM, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- KO: ordinary 43 [AZ, BG, BN, CS, DA, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LO: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KK, KM, KN, KO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LT: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- LV: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- ML: ordinary 35 [ES, ES-419, ET, FI, FR, KK, KM, KN, LO, LT, LV, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- MS: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- MY: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KK, KM, KN, KO, LO, LT, LV, ML, MS, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- NE: ordinary 35 [ES, ES-419, ET, FI, FR, KK, KM, KN, LO, LT, LV, ML, MS, MY, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [romance_core].
- NL: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- NO: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- PL: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- PT-BR: ordinary 42 [AZ, BG, BN, CS, DA, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- RO: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- RU: ordinary 43 [AZ, BG, BN, CS, DA, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- SI: ordinary 35 [ES, ES-419, ET, FI, FR, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [romance_core].
- SK: ordinary 36 [EN, EN-GB, ES, ES-419, ET, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SL: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- SR: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 1 [romance_core].
- SV: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- SW: ordinary 37 [EN, EN-GB, ES, ES-419, ET, HY, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- TA: ordinary 35 [ES, ES-419, ET, FI, FR, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- TE: ordinary 35 [ES, ES-419, ET, FI, FR, KK, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TH, TL, TR, UZ, VI, ZH]; Polyglot full 3 [global_europe_core, romance_core, slavic_core].
- TH: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TL, TR, UZ, VI, ZH]; Polyglot full 1 [romance_core].
- TL: ordinary 37 [EN, EN-GB, ES, ES-419, ET, HY, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TR: ordinary 43 [AZ, BG, BN, CS, DA, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, UZ, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- UZ: ordinary 37 [EN, EN-GB, ES, ES-419, ET, HY, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, VI, ZH]; Polyglot full 2 [global_europe_core, slavic_core].
- VI: ordinary 34 [ES, ES-419, ET, FI, FR, KM, KN, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, ZH]; Polyglot full 1 [romance_core].
- ZH: ordinary 38 [HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NE, NL, NO, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI]; Polyglot full 1 [slavic_core].

## Нераспознанные загрузки

- Всего в uploads-плейлистах, но без подтвержденной продуктовой identity: 92.
- Свежих неразобранных блокеров apply: 0.
- videos.list не вернул статус: 22.
- Полный точный список, ID, URL и статус находятся в верхнеуровневом `unclassifiedUploads` файла `config/youtube-publication-snapshot.json`.

По каналам: AZ=1, BN=1, CS=1, DA=1, EN=70, ET=1, FI=1, HR=3, HU=1, HY=1, IS=1, IT=1, KA=1, KK=1, KN=1, LO=1, LT=1, LV=1, ML=1, NL=1, NO=1.
