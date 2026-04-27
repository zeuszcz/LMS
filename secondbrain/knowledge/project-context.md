# YES LMS — Project Context

> Injected at every AI session start. Keep ≤8 KB. Source of truth for high-level
> architecture, stack, modules, conventions, and critical zones.

## What this project is

LMS (Learning Management System) for **YES Center** — a chain of language schools
in Moscow region (yescenter.ru). 8 languages (en/de/fr/it/es/zh/ja/ko), 4 audiences
(kids 3+, teens, adults, B2B), 20+ branches in MSK + MO + Vladimir region, hybrid
online/offline, official Cambridge English centre, proprietary FLæʃcom methodology.

Replaces a patchwork of paper journals, Excel schedules, 1С billing, and Zoom for
online lessons.

## Stack

| Layer    | Tech                                                                             |
|----------|----------------------------------------------------------------------------------|
| Backend  | Python 3.12, FastAPI, SQLAlchemy 2.x async, Alembic, PostgreSQL 16, Redis, Celery |
| Frontend | React 18, Vite, TypeScript, Zustand, TanStack Query, react-router 7, Tailwind CSS |
| Realtime | WebSocket (FastAPI), LiveKit (video — Phase 2)                                    |
| Storage  | S3-compatible (MinIO dev, Yandex Cloud prod)                                      |
| Auth     | JWT access + refresh, bcrypt password hash; SSO via OIDC for B2B (Phase 4)        |
| Deploy   | Docker Compose → Kubernetes after MVP                                             |

Python deps via `uv`. Node deps via `npm`.

## Repository layout

```
backend/                FastAPI app
  app/
    core/               config, database, security, auth dependencies
    models/             SQLAlchemy ORM (one file per aggregate root)
    schemas/            Pydantic request/response
    routers/            FastAPI routers (one file per resource)
    services/           Business logic, no FastAPI deps
  alembic/              Migrations
  tests/                pytest (unit on aiosqlite, integration on Postgres)

frontend/               React SPA
  src/
    api/                axios + per-resource modules
    components/         reusable UI
    pages/              route-level components
    stores/             Zustand
    types/              shared TS types

secondbrain/            this wiki
docs/                   SRS, roadmap, API spec, contributing
.github/workflows/      CI
docker-compose.yml      dev infra (postgres, redis, minio, mailhog)
```

## Roles (RBAC)

`student`, `teacher`, `parent`, `methodist`, `branch_manager`, `admin`,
`b2b_coordinator`. A user may hold multiple roles, optionally scoped to a branch.

Role assignment via `user_role` table (many-to-many with branch context).

## Roadmap (current = MVP)

| Phase | Weeks | Scope                                                                                  |
|-------|-------|----------------------------------------------------------------------------------------|
| MVP   | 16    | Auth, course catalog, groups, schedule, journal, homework, parent cabinet, notifications |
| 2     | 12    | Payments (YooKassa), 1C sync, video lessons (LiveKit), PWA, teacher templates           |
| 3     | 10    | Mock exams (Cambridge / IELTS / EGE), AI writing feedback, pronunciation scoring        |
| 4     | 10    | B2B portal (multi-tenant), summer-program marketplace, kids gamification                 |

## Critical zones (extra caution, mandatory tests)

- `backend/app/services/billing*` — subscription credits, lesson debits
- `backend/app/services/grading*` — affects student progress
- `backend/app/core/auth.py`, `backend/app/core/security.py` — JWT + RBAC
- `backend/alembic/versions/**` — production migrations
- `frontend/src/pages/exam/**` (Phase 3) — anti-cheat
- Any 1C integration adapter

## Compliance

- 152-ФЗ (RU personal data law): all PII (especially minors') hosted in RU
  (Yandex Cloud / VK Cloud); video recordings only with parent consent stored
  in `recording_consent`.
- 54-ФЗ (RU fiscal law): receipts via online cash provider integrated with the
  acquiring partner.

## Conventions

- Money as `*_minor` integers (kopeks). Never floats.
- Time as timezone-aware UTC at storage; convert to user TZ in presentation.
- UUIDs as primary keys (UUID v7 ideally — sortable, future migration).
- Soft-delete via `deleted_at`; hard-delete only on 152-FZ erasure request.
- Routers thin: validate → delegate to service.
- All writes wrapped in a single per-request transaction (`get_db` dependency).
- Code, identifiers, comments — English. UI text — Russian. Wiki — English.
- Tests for all critical zones; ≥70% backend coverage target.

## Key invariants

1. `user_role` row uniquely identified by `(user_id, role, branch_id)` among non-revoked.
2. `enrollment` unique per `(student_id, group_id)` while not soft-deleted.
3. `attendance.recorded_by` must be teacher of the group OR methodist of the branch.
4. Video session start blocked if any minor participant lacks `recording_consent`.
5. `payment.idempotency_key` unique — protects from duplicate webhooks.
6. `lesson_credit_ledger` is append-only; balance = SUM(delta), never negative
   beyond a tolerance buffer (race-condition guard).

## Where to start when new

1. Read this file (you just did).
2. `secondbrain/knowledge/index.md` for the catalog of concepts.
3. The relevant concept article.
4. Source code only for the exact lines to edit.
