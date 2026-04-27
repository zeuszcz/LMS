# Architecture

High-level design of YES LMS. Read **before** any cross-cutting change.

## Bird's-eye view

```
                        ┌──────────────────────────┐
   Web SPA (React)      │  Mobile (PWA, RN P2)     │
        │               └─────────────┬────────────┘
        │                             │
        ▼              HTTPS/REST/WS  ▼
   ┌──────────────────────────────────────────┐
   │  FastAPI app (uvicorn + gunicorn workers)│
   │  ┌──────────┐ ┌──────────┐ ┌───────────┐ │
   │  │ routers/ │ │services/ │ │ models/   │ │
   │  └────┬─────┘ └────┬─────┘ └─────┬─────┘ │
   │       └────────────┴─────────────┘       │
   └────────────┬──────────────┬──────────────┘
                │              │
                ▼              ▼
         ┌─────────────┐  ┌─────────────┐
         │ Postgres 16 │  │ Redis 7     │
         └─────────────┘  └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                          │ Celery      │
                          │ workers     │
                          └─────────────┘

  External: YooKassa · 1C · LiveKit · Telegram · SMS · Email · S3/MinIO
```

## Services (logical, not separate processes in MVP)

| Service              | Responsibility                                                       |
|----------------------|----------------------------------------------------------------------|
| `auth_service`       | login, token issue/refresh, password reset                           |
| `user_service`       | CRUD users, role assignment, parent-student linking                  |
| `course_service`     | catalog, course versioning (Phase 2)                                 |
| `group_service`      | groups, schedule slots, enrollments                                  |
| `lesson_service`     | lesson instances, attendance, journal close                          |
| `homework_service`   | assignments, submissions, grading (manual + auto for quiz)            |
| `progress_service`   | skill scores derivation, reports                                     |
| `billing_service`    | subscriptions, lesson credit ledger, freeze, cancel (Phase 2)         |
| `notification_svc`   | outbox pattern, templated email/TG/SMS, retry                         |
| `integration_*`      | adapters for 1C, YooKassa, LiveKit                                    |

In MVP all live in one FastAPI process. Services that grow heavy (billing,
notifications) are first candidates for splitting in Phase 4.

## Request lifecycle

1. SPA sends `Authorization: Bearer <access>`.
2. `oauth2_scheme` extracts token; `get_current_user` decodes and loads user.
3. Router validates payload via Pydantic schema.
4. Router calls service with `(db, current_user, payload)`.
5. Service performs SQLAlchemy ops in the **same** session (transaction-per-request).
6. Service returns ORM models or DTOs; router serializes via Pydantic.
7. Long-running side effects (notifications, integrations) → enqueue Celery task,
   return early.

## Async boundaries

- **HTTP I/O**: async (httpx) — for integrations called from request handlers
  with strict latency budget (e.g., payment init).
- **Heavy async-unsafe SDKs** (some 1C client variants): wrap in
  `asyncio.to_thread`.
- **Background work** (1C nightly sync, weekly progress reports): Celery workers.

## Database

- One Postgres database per environment.
- Schemas: default `public` for application; future `audit` for `audit_log`
  (partitioned).
- All writes via `AsyncSession`; `expire_on_commit=False` (we return ORM
  instances after commit).
- Soft-delete: `deleted_at` filter applied in service layer (no global
  `Listener`s — too magic).

## Frontend architecture

- **Routing**: react-router 7. All routes except `/login` wrapped in
  `ProtectedRoute` + `Layout`.
- **State**:
  - Server state → TanStack Query (cache, staleness).
  - Client state (auth tokens, UI toggles) → Zustand stores.
  - **No** Context API for state (re-render footgun).
- **API client**: single `axios` instance with interceptors for token refresh
  (single-flight via `refreshPromise`).
- **Form**: react-hook-form + zod (schemas mirror backend Pydantic where useful).

## Deployment topology (target)

```
                        ┌─────────────────┐
  CDN / static (frontend dist)            │
                                          ▼
                    ┌──────────────────────────────┐
                    │   Ingress / TLS termination  │
                    └──────┬─────────────┬─────────┘
                           │             │
              ┌────────────▼──┐    ┌─────▼──────────┐
              │ FastAPI pods  │    │  WS pods       │
              │ (3+ replicas) │    │ (sticky sess.) │
              └──────┬────────┘    └────────────────┘
                     │
        ┌────────────┴───────────────┐
        ▼            ▼               ▼
   Postgres HA   Redis cluster   Celery workers
```

## Decisions worth knowing

- **Why FastAPI over Django**: async, OpenAPI auto-generation, alignment with
  existing CorporateMessanger expertise.
- **Why Zustand over Redux**: simpler API, no boilerplate, fits the "client UI
  state" niche while server state lives in TanStack Query.
- **Why JWT over server sessions**: enables horizontal scaling; refresh tokens
  rotate and are revocable via DB lookup (Phase 2).
- **Why MinIO in dev**: behavior-compatible with S3, no cloud dependency for
  local development.
