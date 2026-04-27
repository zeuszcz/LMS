# SecondBrain Scripts

Utilities for compiling daily logs into knowledge concepts, querying the wiki,
linting health.

## Status

**Phase 1**: not yet ported. Manual editing of concepts and `log.md` is fine.

**Phase 2**: port from CorporateMessanger SecondBrain:
- `compile.py` — daily logs → durable concepts (LLM-assisted)
- `query.py` — index-guided question answering with `--file-back` to `qa/`
- `lint.py` — broken links, orphans, stale (>90d) articles, contradictions
- `sync_memory.py` — pull Claude Code auto-memory into daily log
- `flush.py` — fire-and-forget hook to append assistant transcripts

Until then, follow the discipline manually:
1. After a meaningful session, update `knowledge/log.md`.
2. Update or create the relevant concept in `knowledge/concepts/`.
3. Update `knowledge/index.md` if a new concept was created.
