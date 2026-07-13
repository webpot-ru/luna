# Карта публикаций YouTube

Сформировано: 2026-07-13T11:03:36.313Z

Source of truth: live YouTube API readback через четыре GitHub OAuth route плюс durable registry/calendar comparison. Полный per-video список и точные URL находятся в `config/youtube-publication-snapshot.json`.

> Этот документ не разрешает удаление, повторную загрузку или публикацию. Любой YouTube write требует отдельного preflight и подтверждения.

## Сводка

| Deck | API routes | Live видео | Public | Scheduled | Private без будущей даты | Статус не прочитан | Durable-only | Хвосты ordinary | Хвосты Polyglot full | Live дубли | Registry-only дубли | Calendar blockers | Strict evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `home_kitchen_cooking_actions_a1_a2` | 4/4 | 1242 | 1091 | 151 | 0 | 0 | 0 | 1470 | 204 | 12 | 0 | 12 | no |
| `home_kitchen_cookware_pilot_01` | 4/4 | 2928 | 2904 | 17 | 0 | 7 | 24 | 0 | 1 | 19 | 6 | 0 | no |

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

Live API window: 2026-07-13T07:52:04.361Z .. 2026-07-13T07:52:47.184Z.

> Текущий снимок годится для инвентаризации, но не для apply: старый audit artifact не доказал явным полем полную пагинацию. Новый workflow блокирует apply без `paginationComplete=true`.

GitHub runs:

- youtube-1: [29233424862](https://github.com/webpot-ru/luna/actions/runs/29233424862)
- youtube-2: [29233438150](https://github.com/webpot-ru/luna/actions/runs/29233438150)
- youtube-3: [29233447499](https://github.com/webpot-ru/luna/actions/runs/29233447499)
- youtube-4: [29233462502](https://github.com/webpot-ru/luna/actions/runs/29233462502)

### Каналы

| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| AZ | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T10:30:00Z | 2026-07-13T10:30:00Z |
| BG | 29 | 26 | 3 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T14:30:00Z |
| BN | 28 | 26 | 2 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T11:30:00Z |
| CS | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| DA | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| DE | 13 | 12 | 1 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| EN | 11 | 3 | 8 | 0 | 0 | 0 | 41 | 4 | 0 | 0 | 2026-07-13T12:30:00Z | 2026-07-14T15:30:00Z |
| ES-419 | 17 | 0 | 17 | 0 | 0 | 0 | 41 | 4 | 6 | 0 | 2026-07-15T06:30:00Z | 2026-07-16T18:30:00Z |
| ET | 28 | 26 | 2 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T11:30:00Z |
| FI | 28 | 26 | 2 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T11:30:00Z |
| FR | 13 | 12 | 1 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| HI | 13 | 12 | 1 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T09:00:00Z |
| HR | 30 | 27 | 3 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T15:30:00Z |
| HU | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| HY | 29 | 27 | 2 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | 2026-07-13T10:30:00Z | 2026-07-13T13:30:00Z |
| ID | 13 | 13 | 0 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | - | - |
| IS | 29 | 26 | 3 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T14:30:00Z |
| IT | 30 | 27 | 3 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T15:30:00Z |
| JA | 13 | 12 | 1 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T08:30:00Z |
| KA | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T10:30:00Z | 2026-07-13T10:30:00Z |
| KK | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| KM | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T10:30:00Z | 2026-07-13T10:30:00Z |
| KN | 30 | 26 | 4 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T18:00:00Z |
| KO | 13 | 12 | 1 | 0 | 0 | 0 | 40 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T08:30:00Z |
| LO | 27 | 27 | 0 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | - | - |
| LT | 27 | 26 | 1 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T08:30:00Z |
| LV | 29 | 26 | 3 | 0 | 0 | 0 | 24 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T14:30:00Z |
| ML | 30 | 26 | 4 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T18:00:00Z |
| MS | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| MY | 27 | 26 | 1 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T08:00:00Z | 2026-07-13T08:00:00Z |
| NE | 28 | 26 | 2 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T08:45:00Z | 2026-07-13T11:45:00Z |
| NL | 28 | 27 | 1 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| NO | 27 | 22 | 5 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T21:30:00Z |
| PL | 25 | 20 | 5 | 0 | 0 | 0 | 28 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T21:30:00Z |
| PT-BR | 17 | 0 | 17 | 0 | 0 | 0 | 41 | 4 | 6 | 0 | 2026-07-13T22:30:00Z | 2026-07-15T16:30:00Z |
| RO | 28 | 21 | 7 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-14T08:30:00Z |
| RU | 12 | 11 | 1 | 0 | 0 | 0 | 41 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T08:30:00Z |
| SI | 28 | 26 | 2 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T12:00:00Z |
| SK | 28 | 19 | 9 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-14T15:30:00Z |
| SL | 27 | 26 | 1 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| SR | 27 | 26 | 1 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| SV | 25 | 19 | 6 | 0 | 0 | 0 | 28 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-14T06:30:00Z |
| SW | 28 | 25 | 3 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T14:30:00Z |
| TA | 27 | 26 | 1 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T09:00:00Z |
| TE | 30 | 26 | 4 | 0 | 0 | 0 | 23 | 4 | 0 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T18:00:00Z |
| TH | 28 | 22 | 6 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T10:30:00Z | 2026-07-14T07:30:00Z |
| TL | 26 | 26 | 0 | 0 | 0 | 0 | 27 | 4 | 0 | 0 | - | - |
| TR | 9 | 8 | 1 | 0 | 0 | 0 | 44 | 4 | 0 | 0 | 2026-07-13T08:30:00Z | 2026-07-13T08:30:00Z |
| UZ | 27 | 26 | 1 | 0 | 0 | 0 | 26 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |
| VI | 28 | 22 | 6 | 0 | 0 | 0 | 25 | 4 | 0 | 0 | 2026-07-13T10:30:00Z | 2026-07-14T07:30:00Z |
| ZH | 8 | 7 | 1 | 0 | 0 | 0 | 45 | 4 | 0 | 0 | 2026-07-13T09:30:00Z | 2026-07-13T09:30:00Z |

### Дубли

- ES-419 | ordinary|home_kitchen_cooking_actions_a1_a2|ES-419|DE | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=5CYu9H3ad_E , https://www.youtube.com/watch?v=W-2OjyIEOxk; предварительно оставить W-2OjyIEOxk (единственный durable row). Удаление не выполнено.
- ES-419 | ordinary|home_kitchen_cooking_actions_a1_a2|ES-419|EN | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=JNSkFMcADzs , https://www.youtube.com/watch?v=X6CcvRzjn_E; предварительно оставить X6CcvRzjn_E (единственный durable row). Удаление не выполнено.
- ES-419 | ordinary|home_kitchen_cooking_actions_a1_a2|ES-419|EN-GB | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=o6hLAvBe0dI , https://www.youtube.com/watch?v=sYR0B214ivU; предварительно оставить o6hLAvBe0dI (единственный durable row). Удаление не выполнено.
- ES-419 | ordinary|home_kitchen_cooking_actions_a1_a2|ES-419|ET | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=C71sRC7wHxc , https://www.youtube.com/watch?v=zGQGti-vSzM; предварительно оставить zGQGti-vSzM (единственный durable row). Удаление не выполнено.
- ES-419 | ordinary|home_kitchen_cooking_actions_a1_a2|ES-419|FI | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=azi7X37qFUg , https://www.youtube.com/watch?v=gzGDC6zdTYo; предварительно оставить gzGDC6zdTYo (единственный durable row). Удаление не выполнено.
- ES-419 | ordinary|home_kitchen_cooking_actions_a1_a2|ES-419|FR | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=LMZnf4SMO18 , https://www.youtube.com/watch?v=W24IPkkYHWU; предварительно оставить W24IPkkYHWU (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cooking_actions_a1_a2|PT-BR|DE | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=wDibhaiNTtg , https://www.youtube.com/watch?v=x2fNqjEi0sQ; предварительно оставить wDibhaiNTtg (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cooking_actions_a1_a2|PT-BR|EN | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=CEAykOerHB8 , https://www.youtube.com/watch?v=IKlShjdl8Do; предварительно оставить CEAykOerHB8 (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cooking_actions_a1_a2|PT-BR|EN-GB | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=G_FE62lQ8gU , https://www.youtube.com/watch?v=joSwTjhpJos; предварительно оставить joSwTjhpJos (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cooking_actions_a1_a2|PT-BR|ES | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=7ruou3j2uzk , https://www.youtube.com/watch?v=HjvUol0I4MI; предварительно оставить 7ruou3j2uzk (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cooking_actions_a1_a2|PT-BR|ES-419 | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=MlCn1VafEPQ , https://www.youtube.com/watch?v=xkpdF4QzM4o; предварительно оставить MlCn1VafEPQ (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cooking_actions_a1_a2|PT-BR|ET | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=Xq9VnS2a7pI , https://www.youtube.com/watch?v=nzoYvwkCvwQ; предварительно оставить Xq9VnS2a7pI (единственный durable row). Удаление не выполнено.

### Хвосты

- AZ: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- BG: ordinary 24 [MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- BN: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- CS: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- DA: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- DE: ordinary 40 [HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- EN: ordinary 41 [HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ES-419: ordinary 41 [HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ET: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- FI: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- FR: ordinary 40 [HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HI: ordinary 40 [HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HR: ordinary 23 [MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HU: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- HY: ordinary 24 [MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ID: ordinary 40 [HI, HR, HU, HY, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- IS: ordinary 24 [MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- IT: ordinary 23 [MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- JA: ordinary 40 [HI, HR, HU, HY, ID, IS, IT, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KA: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KK: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KM: ordinary 25 [ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KN: ordinary 23 [MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- KO: ordinary 40 [HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LO: ordinary 26 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LT: ordinary 26 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- LV: ordinary 24 [MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ML: ordinary 23 [MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- MS: ordinary 25 [LV, ML, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- MY: ordinary 26 [LT, LV, ML, MS, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- NE: ordinary 25 [LV, ML, MS, MY, NB, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- NL: ordinary 25 [LV, ML, MS, MY, NB, NE, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- NO: ordinary 26 [LT, LV, ML, MS, MY, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- PL: ordinary 28 [KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- PT-BR: ordinary 41 [FI, FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- RO: ordinary 25 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- RU: ordinary 41 [FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SI: ordinary 25 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SK: ordinary 25 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SL: ordinary 26 [LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SR: ordinary 26 [LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SV, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SV: ordinary 28 [KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SW, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- SW: ordinary 25 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, TA, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TA: ordinary 26 [LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TE, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TE: ordinary 23 [MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TH, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TH: ordinary 25 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TL, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TL: ordinary 27 [LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TR, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- TR: ordinary 44 [ES-419, ET, FI, FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, UZ, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- UZ: ordinary 26 [LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, VI, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- VI: ordinary 25 [LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, ZH]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].
- ZH: ordinary 45 [ES, ES-419, ET, FI, FR, HI, HR, HU, HY, ID, IS, IT, JA, KA, KK, KM, KN, KO, LO, LT, LV, ML, MS, MY, NB, NE, NL, PL, PT, PT-BR, RO, RU, SI, SK, SL, SR, SV, SW, TA, TE, TH, TL, TR, UZ, VI]; Polyglot full 4 [global_europe_core, romance_core, east_asia_core, slavic_core].

## home_kitchen_cookware_pilot_01

Live API window: 2026-07-13T07:49:57.426Z .. 2026-07-13T07:51:51.113Z.

> Текущий снимок годится для инвентаризации, но не для apply: старый audit artifact не доказал явным полем полную пагинацию. Новый workflow блокирует apply без `paginationComplete=true`.

GitHub runs:

- youtube-1: [29233315716](https://github.com/webpot-ru/luna/actions/runs/29233315716)
- youtube-2: [29233347846](https://github.com/webpot-ru/luna/actions/runs/29233347846)
- youtube-3: [29233396360](https://github.com/webpot-ru/luna/actions/runs/29233396360)
- youtube-4: [29233413736](https://github.com/webpot-ru/luna/actions/runs/29233413736)

### Каналы

| Support | Live видео | Public | Scheduled | Private | Статус ? | Durable-only | Ordinary tails | Polyglot tails | Live дубли | Registry-only | Следующая публикация | Последняя в очереди |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| AZ | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| BG | 55 | 55 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | - | - |
| BN | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | - | - |
| CS | 57 | 56 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | - | - |
| DA | 53 | 52 | 0 | 0 | 1 | 5 | 0 | 0 | 0 | 0 | - | - |
| DE | 59 | 59 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | - | - |
| EN | 57 | 57 | 0 | 0 | 0 | 7 | 0 | 0 | 1 | 6 | - | - |
| ES-419 | 59 | 48 | 11 | 0 | 0 | 2 | 0 | 0 | 2 | 0 | 2026-07-13T09:00:00Z | 2026-07-14T21:30:00Z |
| ET | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| FI | 58 | 57 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | - | - |
| FR | 60 | 59 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | - | - |
| HI | 59 | 59 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | - | - |
| HR | 55 | 55 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | - | - |
| HU | 58 | 57 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | - | - |
| HY | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| ID | 59 | 59 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | - | - |
| IS | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| IT | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| JA | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KA | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KK | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KM | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KN | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| KO | 59 | 59 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | - | - |
| LO | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| LT | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| LV | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| ML | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| MS | 57 | 57 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | - | - |
| MY | 59 | 59 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | - | - |
| NE | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| NL | 58 | 57 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | - | - |
| NO | 58 | 57 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | - | - |
| PL | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| PT-BR | 62 | 56 | 6 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 2026-07-13T09:00:00Z | 2026-07-13T19:30:00Z |
| RO | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| RU | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SI | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SK | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SL | 56 | 56 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | - | - |
| SR | 59 | 59 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | - | - |
| SV | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| SW | 58 | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TA | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TE | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TH | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TL | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| TR | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| UZ | 57 | 57 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | - | - |
| VI | 59 | 59 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | - | - |
| ZH | 58 | 58 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | - | - |

### Дубли

- DE | polyglot-target-set|home_kitchen_cookware_pilot_01|DE|full|CS,PL,RU,SK | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=K3ILZouSXC8 , https://www.youtube.com/watch?v=PhLyTsDPzL0; предварительно оставить K3ILZouSXC8 (единственный durable row). Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|AZ | evidence=duplicate_registry_assignment: https://www.youtube.com/watch?v=OS2FCsn1FpY , https://www.youtube.com/watch?v=xWTovByJh-w; требуется ручной выбор canonical video. Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|DA | evidence=duplicate_registry_assignment: https://www.youtube.com/watch?v=ftQEUH5G9bQ , https://www.youtube.com/watch?v=kyUMvBfMO8E; требуется ручной выбор canonical video. Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|DE | evidence=duplicate_registry_assignment: https://www.youtube.com/watch?v=MSc8aoSBN9A , https://www.youtube.com/watch?v=j6pxravKRfI; требуется ручной выбор canonical video. Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|ES | evidence=duplicate_registry_assignment: https://www.youtube.com/watch?v=MRWXhf3FZc4 , https://www.youtube.com/watch?v=u1yEwN7ZCQ8; требуется ручной выбор canonical video. Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|ES-419 | evidence=duplicate_registry_assignment: https://www.youtube.com/watch?v=Hnf-H2z-Zd4 , https://www.youtube.com/watch?v=fDxDXx09Vds; требуется ручной выбор canonical video. Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|ET | evidence=duplicate_registry_assignment: https://www.youtube.com/watch?v=Movl7Y_tL8g , https://www.youtube.com/watch?v=lXOmgK5og6k; требуется ручной выбор canonical video. Удаление не выполнено.
- EN | ordinary|home_kitchen_cookware_pilot_01|EN|NB | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=UWrybIrC1GM , https://www.youtube.com/watch?v=WXJibqBNXqs; предварительно оставить WXJibqBNXqs (единственный durable row). Удаление не выполнено.
- ES-419 | ordinary|home_kitchen_cookware_pilot_01|ES-419|AZ | evidence=duplicate_live_assignment+duplicate_registry_assignment: https://www.youtube.com/watch?v=9LDjPJPFGkg , https://www.youtube.com/watch?v=z1c3voGyUL4; требуется ручной выбор canonical video. Удаление не выполнено.
- ES-419 | polyglot-target-set|home_kitchen_cookware_pilot_01|ES-419|full|ES,FR,IT,PT | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=4E3lliVWsbA , https://www.youtube.com/watch?v=unM5m2K1gwk; требуется ручной выбор canonical video. Удаление не выполнено.
- FR | polyglot-target-set|home_kitchen_cookware_pilot_01|FR|full|CS,PL,RU,SK | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=624J068RRmc , https://www.youtube.com/watch?v=fiyB2e6cTR4; предварительно оставить 624J068RRmc (единственный durable row). Удаление не выполнено.
- HI | polyglot-target-set|home_kitchen_cookware_pilot_01|HI|full|CS,PL,RU,SK | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=375-Y5REamo , https://www.youtube.com/watch?v=K-eOwLLk444; предварительно оставить 375-Y5REamo (единственный durable row). Удаление не выполнено.
- ID | polyglot-target-set|home_kitchen_cookware_pilot_01|ID|full|CS,PL,RU,SK | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=AWuZY7DBCto , https://www.youtube.com/watch?v=oTa4DBXmScs; предварительно оставить oTa4DBXmScs (единственный durable row). Удаление не выполнено.
- KO | polyglot-target-set|home_kitchen_cookware_pilot_01|KO|full|CS,PL,RU,SK | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=fWPkg-37ZwM , https://www.youtube.com/watch?v=ibeNRukriYI; предварительно оставить fWPkg-37ZwM (единственный durable row). Удаление не выполнено.
- MY | polyglot-target-set|home_kitchen_cookware_pilot_01|MY|full|DE,EN,ES,FR | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=B2pJBKf78rM , https://www.youtube.com/watch?v=M7kl3T-lzZk; предварительно оставить M7kl3T-lzZk (единственный durable row). Удаление не выполнено.
- MY | polyglot-target-set|home_kitchen_cookware_pilot_01|MY|full|JA,KO,ZH | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=1OKbKl88nx8 , https://www.youtube.com/watch?v=yQ3894R4b_4; предварительно оставить 1OKbKl88nx8 (единственный durable row). Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cookware_pilot_01|PT-BR|EN | evidence=duplicate_live_assignment+duplicate_registry_assignment: https://www.youtube.com/watch?v=42tjeth7lAY , https://www.youtube.com/watch?v=FF8I9YAeZrc; требуется ручной выбор canonical video. Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cookware_pilot_01|PT-BR|HR | evidence=duplicate_live_assignment+duplicate_registry_assignment: https://www.youtube.com/watch?v=7dbLkq9IyK0 , https://www.youtube.com/watch?v=yx5d0FIYso4; требуется ручной выбор canonical video. Удаление не выполнено.
- PT-BR | ordinary|home_kitchen_cookware_pilot_01|PT-BR|HU | evidence=duplicate_live_assignment+duplicate_registry_assignment: https://www.youtube.com/watch?v=MzxVtTQ-iiU , https://www.youtube.com/watch?v=tihNABOX1ug; требуется ручной выбор canonical video. Удаление не выполнено.
- PT-BR | polyglot-target-set|home_kitchen_cookware_pilot_01|PT-BR|full|ES,FR,IT,PT | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=L6qSQzb-YFY , https://www.youtube.com/watch?v=k9YPEGn_jFY; требуется ручной выбор canonical video. Удаление не выполнено.
- SR | polyglot-target-set|home_kitchen_cookware_pilot_01|SR|full|DE,EN,ES,FR | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=fI4PgvlKTv0 , https://www.youtube.com/watch?v=hSwe2oR0-KE; предварительно оставить hSwe2oR0-KE (единственный durable row). Удаление не выполнено.
- SR | polyglot-target-set|home_kitchen_cookware_pilot_01|SR|full|JA,KO,ZH | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=RgeghsHzXcQ , https://www.youtube.com/watch?v=jDFFlB6U4Ro; предварительно оставить jDFFlB6U4Ro (единственный durable row). Удаление не выполнено.
- VI | polyglot-target-set|home_kitchen_cookware_pilot_01|VI|full|DE,EN,ES,FR | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=-S-SHVrn74U , https://www.youtube.com/watch?v=_FuvQtu6aRM; предварительно оставить _FuvQtu6aRM (единственный durable row). Удаление не выполнено.
- VI | polyglot-target-set|home_kitchen_cookware_pilot_01|VI|full|JA,KO,ZH | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=OV5CAWpDLFI , https://www.youtube.com/watch?v=SGXn8aa_7Xs; предварительно оставить OV5CAWpDLFI (единственный durable row). Удаление не выполнено.
- ZH | polyglot-target-set|home_kitchen_cookware_pilot_01|ZH|full|CS,PL,RU,SK | evidence=duplicate_live_assignment: https://www.youtube.com/watch?v=S44eqfMl-Sk , https://www.youtube.com/watch?v=sMz0r-1QPHc; предварительно оставить S44eqfMl-Sk (единственный durable row). Удаление не выполнено.

### Хвосты

- BN: ordinary 0; Polyglot full 1 [global_europe_core].

## Нераспознанные загрузки

- Всего в uploads-плейлистах, но без подтвержденной продуктовой identity: 193.
- Свежих неразобранных блокеров apply: не определено старым artifact; нужен новый strict audit.
- videos.list не вернул статус: не определено старым artifact; status для unmatched ID не читался.
- Полный точный список, ID, URL и статус находятся в верхнеуровневом `unclassifiedUploads` файла `config/youtube-publication-snapshot.json`.

По каналам: AZ=4, BG=3, BN=3, CS=2, DA=2, DE=5, EN=70, ET=4, FI=2, FR=3, HI=4, HR=4, HU=2, HY=2, ID=2, IS=4, IT=4, KA=4, KK=3, KM=3, KN=4, KO=4, LO=3, LT=4, LV=4, ML=3, MS=2, NL=2, NO=1, PL=4, RO=4, SI=3, SK=4, SL=2, SV=4, TA=3, TE=3, TL=3, UZ=2, ZH=4.
