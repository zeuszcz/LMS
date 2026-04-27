# YES LMS — Backend

FastAPI + SQLAlchemy 2.x async + Alembic + PostgreSQL.

## Quick start

```bash
# 1. Install uv: https://github.com/astral-sh/uv
# 2. Sync deps
uv sync

# 3. Copy env
cp .env.example .env

# 4. Start infra (in repo root)
docker compose up -d postgres redis minio mailhog

# 5. Generate initial migration (one time)
uv run alembic revision --autogenerate -m "initial schema"
uv run alembic upgrade head

# 6. Bootstrap superuser
uv run python -m app.services.bootstrap

# 7. Run dev server
uv run uvicorn app.main:app --reload --port 8000
```

OpenAPI: http://localhost:8000/docs

## Project layout

```
app/
  core/        config, database, security, auth dependencies
  models/      SQLAlchemy ORM (one file per aggregate)
  schemas/     Pydantic request/response models
  routers/     FastAPI routers (one file per resource)
  services/    Business logic (no FastAPI deps inside)
alembic/       Migrations
tests/         Pytest suites (in-memory SQLite for unit, real Postgres for integration)
```

## Conventions

- Routers must be thin: input validation + delegate to a service.
- All SQL via async SQLAlchemy. No `db.execute(text(...))` in routers except `/health/db`.
- All DB writes wrapped in a single transaction per request (fastapi `Depends(get_db)` handles this).
- Migrations: each new field/table is a separate migration. No "merge migrations".
- Tests: write at least one positive + one negative case per endpoint.
- Money: store as integer in `*_minor` (cents/копейки), never `float`.
- Time: always timezone-aware UTC at storage; convert to user TZ in presentation.

## Commands

```bash
uv run pytest                  # unit tests
uv run pytest -m integration   # integration tests (requires Postgres)
uv run ruff check .
uv run ruff format .
uv run mypy app
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
uv run alembic downgrade -1    # smoke-test rollback
```
