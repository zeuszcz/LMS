# YES LMS — Learning Management System

LMS-платформа для лингвистического центра [YES Center](https://yescenter.ru): 8 языков, 4 целевые аудитории (дети 3+, подростки, взрослые, B2B), 20+ филиалов в Москве и МО, гибрид онлайн/офлайн, статус Cambridge English.

**Статус**: alpha — разрабатывается с нуля. Не для продакшена.

---

## Стек

| Слой | Технология |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.x async, Alembic, PostgreSQL 16, Redis, Celery |
| Frontend | React 18, Vite, TypeScript, Zustand, TanStack Query, Tailwind CSS, react-router |
| Realtime | WebSocket (FastAPI), LiveKit (видеоуроки, Phase 2) |
| Хранилище файлов | S3-совместимое (MinIO в dev, Yandex Cloud в prod) |
| Деплой | Docker Compose → Kubernetes (после MVP) |
| Wiki / память | SecondBrain (см. [secondbrain/AGENTS.md](secondbrain/AGENTS.md)) |

## Roadmap

См. [docs/roadmap.md](docs/roadmap.md). Кратко:

| Фаза | Срок | Содержание |
|---|---|---|
| **MVP** | 16 недель | Auth, каталог курсов, группы, расписание, журнал, домашки, родительский кабинет, нотификации |
| Phase 2 | 12 недель | Эквайринг, 1С-интеграция, видеоуроки (LiveKit), PWA, преподавательские шаблоны |
| Phase 3 | 10 недель | Mock-экзамены Cambridge/IELTS/ЕГЭ, AI-фидбек по writing, pronunciation scoring |
| Phase 4 | 10 недель | B2B-портал (multi-tenant), маркетплейс летних программ, геймификация для детей |

Полный план + смета: [docs/srs.md](docs/srs.md).

## Быстрый старт (dev)

Требуется: Docker Desktop, Node 20+, Python 3.12+, [uv](https://github.com/astral-sh/uv).

```bash
# Поднять Postgres + Redis + MinIO
docker compose up -d

# Backend
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000

# Frontend (в другом терминале)
cd frontend
npm install
npm run dev
```

Backend: http://localhost:8000/docs (OpenAPI). Frontend: http://localhost:5173.

Тестовый суперюзер создаётся автоматически при первом запуске:
- email: `admin@yescenter.local`
- password: `change_me_immediately`

## Структура репозитория

```
backend/         FastAPI приложение, миграции, тесты
frontend/        React + Vite SPA
secondbrain/     Wiki-память проекта (см. CLAUDE.md, правило #0)
docs/            SRS, roadmap, API spec, contributing
.github/         CI/CD workflows
docker-compose.yml
CLAUDE.md        Правила разработки для AI-агентов
```

## Принципы разработки

- **Wiki-first** — перед правкой архитектуры читать `secondbrain/knowledge/`.
- **Минимальные изменения** — не рефакторить то, о чём не просили.
- **Тесты обязательны** для платежей, оценок, прогресса, RBAC.
- **152-ФЗ** — ПДн детей хранятся в РФ, согласия от родителей перед записью видеоуроков.
- Полный список правил: [CLAUDE.md](CLAUDE.md).

## Лицензия

Проприетарное ПО. Все права принадлежат YES Center и заказчикам. Внешний код использован на условиях оригинальных лицензий (см. `THIRD_PARTY_NOTICES.md`).
