# AGENTS.md

Рабочие правила для проекта LunaCards.

## Границы работы

- Работать только внутри корня проекта.
- Не читать, не изменять, не перемещать и не удалять файлы вне корня проекта без отдельного явного подтверждения пользователя.
- Удаление файлов и папок запрещено.
- Не использовать `rm`, `git clean`, `git reset --hard`, `git checkout --`, `git restore --source`, `rsync --delete` и любые массовые destructive-команды.
- Если файл нужно убрать, не удалять его напрямую. Перемещать только в `Trash/<timestamp>/<original-relative-path>` через `scripts/move-to-trash.sh`.
- Никогда не очищать `Trash`.

## Обязательный порядок перед работой

Перед любой нетривиальной задачей:

1. Изучить структуру проекта.
2. Открыть [docs/README.md](docs/README.md).
3. Найти профильный source of truth документ.
4. Проверить, нет ли дублей и противоречий.
5. Только после этого предлагать или вносить изменения.

Если документация по теме отсутствует, это считается проблемой структуры проекта. Нужно создать недостающий документ внутри `docs/`, встроить его в индекс и явно зафиксировать, что он является source of truth по теме.

## Изменение правил и документации

- Если нужно изменить уже зафиксированное правило, договоренность, структуру данных, контентную модель карточек, QA или spreadsheet-выдачу, сначала нужно описать предложение пользователю и получить разрешение.
- После разрешения нужно обновить все затронутые документы в том же цикле работы.
- Нельзя завершать задачу, если код, данные или текущие правила расходятся с документацией.

## Документация

Единый вход в документацию: [docs/README.md](docs/README.md).

Документация должна оставаться актуальной вместе с изменениями в:

- модели языковых карточек и переводов;
- schema / database;
- списке языков и порядке колонок;
- правилах транскрипции;
- правилах артиклей, рода, register и display form;
- taxonomy;
- Deck Master Plan и deck specs;
- QA gates, статусах и review-flow;
- Google Sheets / spreadsheet-выдаче;
- seed-данных и export scripts.

## Codex Operational Guardrails

These rules extend project-specific rules without replacing them.

- Start non-trivial work by reading `docs/README.md`, `docs/PROJECT_STATE.md` if it exists, and the relevant source-of-truth document.
- Work only inside this project unless the user explicitly confirms otherwise.
- Do not delete files or folders. Use `scripts/move-to-trash.sh <relative-path>` when an approved removal is needed.
- Keep documentation current in the same work cycle as meaningful code, data, UX, API, deployment, business-rule, or workflow changes.
- Do not create duplicate docs. Update the existing source of truth first; create a new document only for a genuinely new or overloaded topic and link it from `docs/README.md`.
- Use suitable available skills/tools/plugins by default for specialized work: browser checks for UI, image/design workflows for visual tasks, spreadsheet/document/presentation/PDF workflows for those artifacts, GitHub/CI/deploy logs for those systems, readback for DB/external services, measurement for performance, and security review for sensitive surfaces.
- Visual tasks must end with a concrete artifact when the environment allows it: image, file, mockup, screenshot, link, local path, or implemented UI.
- Do not install new dependencies, plugins, connectors, SDKs, services, or frameworks without checking the existing stack and explaining the need.
- Do not expose secrets: API keys, tokens, passwords, cookies, credentials, `.env` contents, private keys, client data, or DB dumps. Do not send sensitive data to external tools without explicit confirmation.
- Do not spend money, credits, quotas, API usage, storage, deploy resources, or run expensive generation/processing without confirmation.
- Do not deploy to production, change external services, run migrations, or perform irreversible data changes without an explicit verification and rollback plan.
- Do not revert user changes. Keep Git staging/commits narrow and only when explicitly requested.
- Report what was changed, what was checked, what was not checked, remaining blockers, and the exact state reached.
- For bug fixes, explain root cause and the verification that proves the fix.
- If proposing follow-up work for a new chat/agent, provide a self-contained launch prompt unless the task is already complete and verified.
- When running long-running tasks (such as video generation via `build-all-deck-videos.mjs`, bulk audits, or scripts taking more than a minute), run them in background/async mode using the `run_command` tool (setting a low `WaitMsBeforeAsync`). Immediately yield and stop calling tools to let the task complete in token-saving mode. Do NOT poll the task status in loops or send intermediate check messages. The system will automatically wake you up when the task finishes. This avoids wasting Gemini API limits, RPM/TPM, and input context tokens.

