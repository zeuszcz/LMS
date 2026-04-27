# SecondBrain — YES LMS Wiki

Karpathy LLM-Wiki pattern. Compounding memory of the project that AI agents
(Claude Code, Cursor, Copilot) read **before** scanning code.

Total token budget: ~25–45× cheaper than re-scanning the codebase on every
architectural question. Wiki encodes the **why** and **invariants** — the kind
of context that isn't recoverable from the source tree.

## Layout

```
secondbrain/
  AGENTS.md                    this file — schema and operations
  knowledge/
    project-context.md         injected into every session (≤8 KB target)
    index.md                   catalog of all concepts (one-line summaries)
    log.md                     append-only daily ingest log
    concepts/                  durable knowledge, ≤45 articles cap
      architecture.md
      data-model.md
      auth-and-rbac.md
      lesson-lifecycle.md
      billing-credits.md
      integrations.md
    connections/               cross-concept links (introduce when 3+ concepts share a theme)
    qa/                        cached answers from /sb-query (file-back)
  daily/                       raw daily logs (YYYY-MM-DD.md), compiled into concepts
  scripts/                     compile / query / sync utilities (Phase 2)
```

## Three layers

| Layer    | Where                            | Lifetime |
|----------|----------------------------------|----------|
| Raw      | `daily/`, source code, docs/     | days     |
| Wiki     | `knowledge/concepts/`            | months/years |
| Schema   | `AGENTS.md` (this file)          | permanent |

## When to update wiki (post-prompt gate)

A wiki update is **mandatory** if the prompt produced any of:

- New architectural component
- Security/privacy policy change (auth, crypto, RBAC, CSP, 152-FZ)
- Caching/invalidation strategy
- Data contract / API protocol change
- Root-cause regression fix with reusable lesson
- New invariant / operational rule

If none — finish the prompt with `wiki: skip (trivial — no durable knowledge)`.

## Three-step update

1. Edit or create a concept under `knowledge/concepts/`.
2. Update `knowledge/index.md` if a new concept was created.
3. Append to `knowledge/log.md`:

   ```
   ## [YYYY-MM-DD] ingest | <topic>
   - What changed
   - Why it matters
   - Where it lives
   ```

## Anti-noise discipline

- **Cap: 45 concepts.** Once reached, update existing concepts instead of adding new.
- 3+ related concepts → create a `connection`, not a separate concept.
- No new concept for a single trivial fix — append to relevant existing concept.
- Don't duplicate: if a concept on this module was updated in the last 24h, append there.

## Language

- **All wiki content in English** for token economy (Claude BPE: ~0.25 tok/char EN vs 2-4 for Cyrillic).
- Exceptions: cited UI strings, error messages, code comments quoted verbatim.
- Daily logs (`daily/`) and `qa/` may be in any language.

## Reading order for new agents

1. `knowledge/project-context.md` — full picture in 5 minutes
2. `knowledge/index.md` — find the relevant concept
3. The concept itself
4. Code only for exact lines to edit

## Useful commands (Phase 2 — when scripts land)

```bash
# Query the wiki:
uv run --directory ./secondbrain python ./secondbrain/scripts/query.py "question" --file-back

# Compile daily logs into concepts:
uv run --directory ./secondbrain python ./secondbrain/scripts/compile.py

# Lint wiki health (broken links, orphans, stale articles):
uv run --directory ./secondbrain python ./secondbrain/scripts/lint.py
```

For now (Phase 1) — manual editing is fine. Scripts to be ported from CorporateMessanger SecondBrain.
