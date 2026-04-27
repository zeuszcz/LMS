# Lesson Lifecycle

From "group created" to "lesson closed" — the central flow of the platform.

## States

```
group: planned ──► active ──► finished ─┐
                  └────► cancelled ─────┘

lesson_instance: planned ──► in_progress ──► finished
                                          └► cancelled
```

State transitions logged in `audit_log` (Phase 2).

## Group creation

1. Methodist or branch_manager creates `study_group` (status=`planned`).
2. Defines `schedule_slot`s (RRULE-like; weekday × time × valid_from/to).
3. System generates `lesson_instance` rows for the first 4 weeks ahead.
4. Enrolls students via `enrollment`.
5. Activates → `status='active'`, students notified (email + Telegram).

Lesson instances beyond 4 weeks materialized lazily by a daily Celery job to
keep the table small.

## Lesson day

```
T-24h: notification fires (parent + student)
T-30m: video room provisioned (Phase 2, online/hybrid mode)
T-15m: "lesson starts soon" push
T+0:   teacher opens journal → lesson_instance.actual_started_at = now()
       lesson.status = 'in_progress'
                ↓
       teacher records attendance per student
       teacher logs participation_score, comments
                ↓
T+duration: teacher clicks "close lesson"
            actual_ended_at = now()
            lesson.status = 'finished'
            ↓ side effects (atomic transaction):
              - debit lesson_credit_ledger for each present/late student (Phase 2)
              - update progress_skill_score (Phase 2)
              - enqueue parent-summary notification
              - mark assigned homeworks "active" (due_at countdown begins)
```

## Attendance rules

| Status   | Credit debited (Phase 2) | Counts as attended |
|----------|-------------------------|--------------------|
| present  | yes                     | yes                |
| late     | yes                     | yes                |
| absent   | yes (unless excused)    | no                 |
| excused  | no                      | no                 |

`recorded_by` must be the group's teacher OR a methodist of the branch.
Enforced in `lesson_service.record_attendance`.

## Cancellation

- **Group cancelled**: all future `lesson_instance` flipped to `cancelled`,
  credits NOT debited, students notified, refund flow per `cancellation` table
  (Phase 2).
- **Single lesson cancelled (<24h)**: penalty rule from `cancellation_policy`
  (Phase 2). MVP: simply mark cancelled, no penalty logic.
- **Student cancels participation**: row in `cancellation` table; if >24h ahead,
  credit refunded; if <24h, credit consumed (configurable per branch).

## Journal close — invariants

1. Teacher cannot close lesson with missing attendance for any enrolled student.
   Implementation: `app/routers/lessons.py:close_lesson` computes
   `enrolled_ids - payload_ids`; non-empty diff returns 400. Test:
   `tests/test_lessons.py::test_close_lesson_requires_full_attendance`.
2. Once closed, attendance is editable only by methodist within 48h, audited (Phase 2).
3. Closing emits exactly one parent-summary notification per student (idempotency
   key `lesson_id + student_id + 'parent_summary'`) — Phase 2.
4. Credit debit happens inside the same DB transaction as `actual_ended_at`
   write — both succeed or both fail (Phase 2 when ledger debits land).
5. Closing is idempotent on a 409: re-closing a lesson in `finished` status returns
   conflict instead of double-side-effects.

## Why we don't allow ad-hoc rescheduling in MVP

A reschedule cascades through schedule slots, calendar invites, parent
notifications, room booking, and credit accounting. We don't have all of those
in MVP. Workaround for MVP: cancel the instance, create a one-off make-up class
manually. Proper reschedule UX in Phase 2.

## Failure modes worth knowing

| Failure                                        | Consequence                                  | Recovery                                 |
|------------------------------------------------|----------------------------------------------|------------------------------------------|
| Teacher loses connection during journal close   | Lesson stuck `in_progress` past end          | Methodist override after 24h, audited    |
| Notification provider down                      | Outbox row stays `pending`, retried by worker | At-most-once for SMS, exactly-once for TG |
| Two teachers open the same journal simultaneously | Only one wins on close (DB transaction)      | Loser sees stale-state error, refresh    |

## Frontend hot paths

- `pages/teacher/JournalPage.tsx` (Phase 1, week 8+) — keyboard-driven entry.
- `pages/teacher/JournalRow.tsx` — single-student row, status + score + comment.
- `stores/journalStore.ts` — optimistic updates, rollback on server error.
