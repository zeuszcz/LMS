# CLAUDE.md — YES LMS Dev Rules

Этот файл — контракт для AI-агентов (Claude Code, Cursor, Copilot) и людей, работающих в репозитории.

## Правило #0 — Wiki-first

**Любой вопрос об архитектуре, флоу, регрессии — СНАЧАЛА `secondbrain/`, только ПОТОМ код.**

Процедура:
1. Проверь `secondbrain/knowledge/project-context.md` (инжектится в session-start).
2. `Read secondbrain/knowledge/index.md` → 2–5 релевантных концептов.
3. Только потом — код, для точных строк под правку.
4. После значимой задачи — обновить `secondbrain/knowledge/log.md` строкой `## [YYYY-MM-DD] ingest | <тема>`.

**Исключения**: дебаг по stacktrace, точный `file:line` от пользователя, абсолютно новая область.

## Правило #0.5 — Post-prompt Wiki Gate

В финале каждого промпта одна из строк:
- `wiki: updated ([[путь/к/статье]])` — обновил concept/index/log.
- `wiki: skip (trivial — no durable knowledge)` — typo, rename, форматирование.

Триггеры обязательного обновления: новая архитектурная единица, security-policy, кеширование, протокол/контракт, root-cause regression fix, новый invariant.

## Правила разработки

1. **Читай код перед правками.**
2. **Минимальные изменения** — не рефакторь то, о чём не просили.
3. **Безопасность** — OWASP top-10, никаких SQL injection / XSS / command injection.
4. **152-ФЗ** — ПДн детей хранятся в РФ. Видеозаписи уроков — только с согласия (родителя для несовершеннолетних).
5. **Тесты обязательны** для:
   - `app/services/billing*` (платежи, баланс кредитов уроков)
   - `app/services/grading*` (оценки, прогресс)
   - `app/core/auth.py`, `app/core/security.py` (RBAC, токены)
   - `alembic/versions/**` (миграции — smoke-тест up+down)
6. **Параллельные tool calls** — независимые операции вызывать параллельно.
7. **Wiki — на английском** для экономии токенов (Claude BPE: ~0.25 токена/символ EN vs 2–4 для кириллицы). Исключения: цитаты UI, error messages от пользователя.
8. **Не дублировать** — проверяй существующие утилиты перед созданием новых.

## Критичные зоны

При изменении этих модулей — особая осторожность, обязательное ревью второго инженера, тесты обязательны:

- `backend/app/services/billing*.py` — расчёт абонементов, списание кредитов
- `backend/app/services/grading*.py` — оценки, влияют на прогресс ученика
- `backend/app/core/auth.py`, `backend/app/core/security.py` — JWT, RBAC, password hashing
- `backend/alembic/versions/**` — миграции на проде
- `frontend/src/pages/exam/**` (Phase 3) — anti-cheat, не должно быть workaround'ов
- Любая интеграция с 1С (`backend/app/services/integrations/onec*`)

## Команды

```bash
# Backend
cd backend
uv run pytest                          # тесты
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run alembic revision --autogenerate -m "описание"
uv run alembic upgrade head

# Frontend
cd frontend
npm run lint
npm run typecheck
npm test
npm run build

# SecondBrain (после крупной задачи)
# редактировать secondbrain/knowledge/log.md и concepts/*.md вручную
# либо использовать /sb-* команды если настроены
```

## Языки

- **Код, comments, имена**: английский.
- **Wiki (`secondbrain/`)**: английский.
- **Документация в `docs/`**: русский (для бизнес-стейкхолдеров) или двуязычно.
- **UI-тексты**: русский (целевая аудитория — RU). i18n заложить в архитектуру с MVP.
- **Ответы AI пользователю**: на языке вопроса.

## Pull Request чек-лист

Перед merge в `main`:
- [ ] Локально `uv run pytest` зелёный
- [ ] `npm run typecheck && npm run lint` зелёный
- [ ] CI зелёный
- [ ] Если миграция: `alembic upgrade head` + `alembic downgrade -1` отработали на пустой БД
- [ ] Обновлён `secondbrain/knowledge/log.md` (или явный `wiki: skip` в описании PR)
- [ ] Если фича — обновлён `docs/api.md` или соответствующий концепт в `secondbrain/knowledge/concepts/`
