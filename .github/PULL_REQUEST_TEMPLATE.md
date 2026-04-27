## What

<!-- 1-2 sentences -->

## Why

<!-- Link to issue/task, or business rationale -->

## How to test

<!-- Steps for reviewer -->

## Checklist

- [ ] CI green
- [ ] Tests added for critical zones (auth / billing / grading / migrations)
- [ ] Migration: `alembic upgrade head && alembic downgrade -1` smoke-tested
- [ ] Updated `secondbrain/knowledge/log.md` (or `wiki: skip (trivial)` justified below)
- [ ] No secrets / PII in diff
- [ ] Screenshots / video for UI changes

## Wiki gate

<!-- One of: -->
<!-- wiki: updated ([[concepts/<name>]]) -->
<!-- wiki: skip (trivial — no durable knowledge) -->
