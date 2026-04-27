# Contributing

> Этот документ — для разработчиков, AI-агентов и подрядчиков, работающих в репозитории.

## Перед стартом

1. Прочитай [CLAUDE.md](../CLAUDE.md) — правила разработки.
2. Прочитай [secondbrain/knowledge/project-context.md](../secondbrain/knowledge/project-context.md) — техническое описание.
3. Подними окружение по [README.md](../README.md).

## Workflow

```
git checkout main
git pull
git checkout -b feat/<short-name>      # или fix/, chore/, docs/
# ... код ...
# локально:
cd backend && uv run pytest && uv run ruff check . && uv run mypy app
cd frontend && npm run typecheck && npm run lint && npm test
git commit -m "<conventional commit message>"
git push -u origin feat/<short-name>
# открыть PR в main
```

## Conventional commits

```
<type>(<scope>): <subject>

<body>
```

Типы: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`.

Scope — модуль (`auth`, `journal`, `billing`, `frontend`, `backend`, `db`, и т.д.).

Примеры:
```
feat(journal): close lesson endpoint with attendance bulk write
fix(auth): refresh token must reject access-type tokens
docs(srs): update phase 2 budget after vendor quotes
```

## PR требования

- [ ] Один логический change per PR. Большие фичи — серия PR.
- [ ] CI зелёный.
- [ ] Тесты для critical zones (auth, billing, grading, миграции).
- [ ] Описание PR содержит:
  - **Что**: 1-2 предложения.
  - **Почему**: ссылка на задачу/issue, либо обоснование.
  - **Как протестить**: для ревьюера.
- [ ] `wiki: updated ([[concept]])` или `wiki: skip (trivial)` — в описании PR.
- [ ] Скриншот / запись для UI-изменений.
- [ ] Миграции: smoke `up + down` локально.

## Code review

- Минимум 1 апрув.
- Critical zone (см. CLAUDE.md) — 2 апрува, один из них — tech lead.
- Reviewer цитирует правило: «правило #N CLAUDE.md», «OWASP-Axx», «invariant в
  [[concept]]» — без цитирования замечание не блокирует merge.
- Стилистические правки — `nit:` префикс, не блокирующие.

## Backend conventions

- Routers тонкие. Бизнес-логика — в services.
- Все запросы async. Никакого синхронного `requests` — только `httpx.AsyncClient`.
- Транзакции — per-request, через dependency `get_db`.
- Деньги — `int` в `*_minor` (копейки), не `float`.
- Времена — `datetime` с TZ (UTC хранение).
- UUID v4 как PK (UUID v7 — миграция в Phase 2).
- Soft-delete через `deleted_at`. Сервисы фильтруют, не глобальные listeners.
- Один файл = одна агрегатная сущность в `models/`.

## Frontend conventions

- Один Zustand store на тематику. Persist — только то, что переживает reload.
- Селекторы узкие: `useStore((s) => s.user)`, не `useStore()`.
- API модули типизированы. В компонентах TanStack Query — не прямые вызовы.
- Бизнес-логика — в hooks/services, не в компонентах.
- Все приватные роуты — через `ProtectedRoute`.
- Tailwind utility-first. `@layer components` — для 3+ повторений.
- i18n: пока RU, ключи в JSON (Phase 2 i18next).

## Тесты

См. [secondbrain/knowledge/concepts/testing-strategy.md](../secondbrain/knowledge/concepts/testing-strategy.md).

Минимум: 1 happy + 1 negative для каждого endpoint. Для critical zones —
покрытие 100%.

## SecondBrain (wiki)

После каждой значимой задачи:
1. Обнови или создай concept в `secondbrain/knowledge/concepts/`.
2. Обнови `secondbrain/knowledge/index.md` если новый concept.
3. Добавь строку в `secondbrain/knowledge/log.md`.

Cap: 45 concepts. Достиг — обновляй существующее, не создавай новое.

Тривиальные изменения (typo, rename, форматирование) — wiki skip, явно отметить
в PR описании: `wiki: skip (trivial)`.

## Безопасность

- Никаких секретов в коммитах. `.env` в `.gitignore`. Шаблон — `.env.example`.
- Пароли через bcrypt (cost 12).
- Токены не логируем.
- ПДн в логах — только `user_id`, никогда email/phone/full_name plain.
- При нахождении уязвимости — открыть private security advisory в GitHub, не
  публичный issue.

## Получить помощь

- Архитектурные вопросы → tech lead через PR-комментарий или Telegram-канал
  команды.
- Деплой / DevOps → DevOps engineer.
- Бизнес-вопросы (как должно работать) → PM или methodist через Linear (Phase 2).

## Лицензия contribution

Открывая PR, автор соглашается, что код передаётся под проприетарной лицензией
проекта (см. [LICENSE](../LICENSE)).
