# Testing Strategy

What to test, where, with which tooling. Targets: 70% backend line coverage,
60% frontend line coverage, **100% on critical zones** (billing, grading, auth).

## Pyramid

```
              ╱╲     end-to-end (Playwright)            5%
             ╱──╲    Phase 2+
            ╱────╲   integration (real Postgres)       15%
           ╱──────╲
          ╱────────╲ unit (in-memory SQLite)            80%
```

## Backend

### Unit tests
- Location: `backend/tests/` (excluding `tests/integration/`).
- DB: `aiosqlite` in-memory. Fixture `db_session` recreates schema per test.
- HTTP: `httpx.AsyncClient` against the FastAPI app via `ASGITransport`.
- Mocked externals: any HTTP call to YooKassa/1C/LiveKit must be patched.
- Run: `uv run pytest`.

### Integration tests
- Location: `backend/tests/integration/`.
- DB: real Postgres (docker-compose service `postgres-test` on port 5433).
- Migrations applied before suite (`alembic upgrade head`).
- Marker: `@pytest.mark.integration`.
- Run: `uv run pytest -m integration`.

### What to test (priority order)

1. **Critical zones** (must be 100%):
   - Auth: login, refresh, expired token, disabled user, role enforcement.
   - Billing: ledger insert, balance computation, freeze, refund, idempotent
     payment webhook (Phase 2).
   - Grading: grade calculation, rubric merging, immutability after timeout.
   - Migration smoke: every new migration tested up + down on empty DB in CI.
2. **Routers**: at least 1 happy-path + 1 negative case per endpoint.
3. **Services**: edge cases — empty inputs, unicode, timezone boundaries
   (Europe/Moscow ↔ UTC), DST transitions.
4. **Models**: only invariants not enforced by DB (e.g., the
   `recorded_by ∈ teachers_of(group)` rule).

### What NOT to test

- Pydantic schema validation (it's Pydantic's job).
- ORM relationship traversal (it's SQLAlchemy's job).
- FastAPI dependency injection plumbing (framework concern).

## Frontend

### Unit tests
- Vitest + Testing Library + jsdom.
- Run: `npm test`.

### What to test

- **Stores** (Zustand): logout clears all state, token persistence on reload.
- **API modules**: error mapping (axios → typed errors).
- **Components with logic**: form validation, conditional rendering, role-based
  gating.

### What NOT to test

- Pure presentational components (snapshot tests are noise).
- Tailwind class application.
- Library code (react-router, TanStack Query internals).

### E2E (Phase 2)
- Playwright, Chromium + Firefox.
- Smoke flow: login → see courses → click course → log out.
- Critical flow: teacher closes journal end-to-end with mocked backend.

## CI gates

- Backend: `pytest`, `ruff check`, `ruff format --check`, `mypy app`.
- Frontend: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Migration smoke: spin up Postgres, run `alembic upgrade head` + `downgrade -1`
  + `upgrade head`.
- Coverage drift: warn if coverage dropped >2 percentage points.

## Fixtures and factories

`tests/conftest.py` provides the building blocks:
- `db_session` — scoped per test, in-memory SQLite (or Postgres for integration).
- `client` — `AsyncClient` with `get_db` dependency override.

Helper factories live in `tests/factories.py` (Phase 1 week 4):
```python
async def make_user(db, *, role=UserRole.student, **kwargs) -> User: ...
async def make_course(db, *, language=Language.en, **kwargs) -> Course: ...
async def make_group(db, course, teacher, **kwargs) -> Group: ...
```

Avoid inline `db.add(User(...))` in tests beyond 1-2 cases — promote to factory.

## Determinism rules

- Time: freeze with `freezegun` or pass an injectable `clock`. Never call
  `datetime.now()` in code paths under test without an indirection.
- Random: seed-controlled or stub `secrets.token_urlsafe`.
- UUIDs: pass-through; tests should not assert on exact UUID values, only on
  presence and uniqueness.
- DB state: reset per test (fixture `db_session` does it).

## Anti-patterns to reject in review

- `time.sleep` in tests — use event-driven waits.
- Tests that hit real external services without an env-guarded marker.
- Snapshot tests on rendered HTML — too brittle, low signal.
- "Test runs the production code with all mocks" — trivially passes, catches nothing.
- Tests that assert on log lines as primary contract.
