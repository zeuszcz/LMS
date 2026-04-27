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

## [2026-04-27] ingest | MVP backend + seed + role-aware UI

- ORM extended: assignment, submission, subscription, payment, lesson_credit_ledger, pricing_plan, notification_outbox, audit_log, schedule_slot. All tables wired into Alembic migrations (initial + add_learning_billing).
- Routers added: /api/branches, /api/groups (with enrollments), /api/lessons (start/close/attendance bulk), /api/assignments (+ submissions, grading), /api/billing (read-only), /api/notifications, /api/progress. Total endpoints: 30.
- Permission service [[concepts/auth-and-rbac]]: branch-scoped helpers `can_manage_group`, `can_record_attendance`, `can_grade`, `can_view_student`. Routers call helpers explicitly rather than re-inventing role checks.
- Lesson lifecycle invariant enforced: closing a lesson requires attendance row for every enrolled student or 400 [[concepts/lesson-lifecycle]]. Tests cover happy path + missing-attendance + cross-teacher 403.
- Seed script `app/services/seed.py`: 3 branches, 5 teachers, 3 methodists, 3 branch managers, 28 students (10 kids / 8 teens / 10 adults), 8 parents linked to minors, 8 published courses, 6 active groups with weekly schedule, ~200 lessons across 6 weeks (2 past + 4 future) with attendance + assignments + submissions + grades for past lessons. Idempotent via marker user.
- Frontend role-aware: Layout filters menu by role; Dashboard renders distinct widgets for student / teacher / parent / admin. Pages: Groups, GroupDetail (journal preview), Lessons, LessonDetail (full attendance journal with bulk save + close), Homework (student submit, teacher grade with rubric), Branches, Users, Notifications.
- Email gotcha pinned: Pydantic EmailStr rejects RFC 6761 reserved TLDs (.local, .test, .invalid, .example). Use `*.example.com` for tests, `.ru`/`.com` for fixtures.
- Where: [[concepts/data-model]] (extended tables), [[concepts/lesson-lifecycle]] (close invariant), [[concepts/auth-and-rbac]] (permissions service), [[concepts/billing-credits]] (ledger model now physical), [[concepts/testing-strategy]] (factories pattern).
