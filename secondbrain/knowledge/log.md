# Ingest Log

Append-only. Newest at the bottom. Every AI session that produces durable
knowledge ends with one entry. Trivial sessions skip.

Format:

```
## [YYYY-MM-DD] ingest | <topic>
- What changed (1-3 bullets)
- Why it matters
- Where: <file paths or concept names>
```

---

## [2026-04-27] ingest | project bootstrap

- Initialized YES LMS repository skeleton: backend (FastAPI + SQLAlchemy 2.x async + Alembic), frontend (React + Vite + TS + Zustand + Tailwind + TanStack Query), docker-compose dev infra (Postgres, Redis, MinIO, Mailhog).
- SecondBrain wiki initialized with core concepts (architecture, data-model, auth-and-rbac, lesson-lifecycle, billing-credits, integrations, testing-strategy) and project-context.md.
- Why: establish wiki-first foundation before code grows; 25-45x token economy on architecture questions vs scanning code.
- Where: full repo tree, see [[concepts/architecture]] for the bird's-eye picture.
