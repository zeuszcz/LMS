# Billing and Lesson Credits

> Phase 2 deliverable. This concept documents the *intended* model so the MVP
> data model leaves room for it.

## Mental model

A student does not "pay per lesson" directly. A student buys a **subscription**
(or "package") and the system maintains a ledger of lesson credits. Each lesson
debits one credit; freeze, refund, and bonus events also write ledger rows.

## Tables

### `pricing_plan`
- `id`, `name`
- `kind` enum: `per_lesson` | `package` | `subscription`
- `lessons_included` (e.g., 8 / 16 / 32)
- `price_minor` (kopeks)
- `valid_from`, `valid_to` — for historical immutability
- `branch_id` nullable — branch-specific pricing

### `subscription`
- `id`, `student_id`, `pricing_plan_id`
- `started_at`, `expires_at`
- `lessons_remaining` — denormalized cached value, source of truth is the ledger
- `frozen_from`, `frozen_to` — pause window
- `status` (active/paused/expired/refunded)

### `lesson_credit_ledger`
**Append-only.** Balance = `SUM(delta)` per subscription.
- `id`, `subscription_id`
- `lesson_instance_id` nullable (debit) / `payment_id` nullable (top-up)
- `delta` — signed integer (e.g., `+8` on package purchase, `-1` on lesson attended)
- `reason` enum: `purchase`, `lesson_debit`, `freeze_refund`, `cancellation_refund`,
  `bonus`, `correction`
- `created_by` (user)
- `created_at`

### `payment`
- `id`, `student_id`, `subscription_id`
- `amount_minor`, `currency`, `provider` (yookassa/cloudpayments/manual)
- `provider_ref`, `idempotency_key` (unique)
- `status` (pending/succeeded/failed/refunded)
- `paid_at`

### `invoice`
- Mirror of payment in 1C. `external_1c_id`, `synced_at`, `sync_status`.

### `cancellation`
- `lesson_instance_id`, `student_id`, `cancelled_at`, `reason`
- `penalty_applied` (bool), `credited_back` (int, signed)

## Hard invariants

1. **Append-only ledger**: `lesson_credit_ledger` rows are never updated or
   deleted. Corrections are new rows with `reason='correction'`.
2. **Balance never negative beyond tolerance**: a small buffer (`-0.1 *
   lessons_included`) tolerates race conditions during simultaneous lesson
   closes; balance below that triggers an alert and freezes auto-debit.
3. **Idempotent payments**: webhook handler keys on `payment.idempotency_key`.
   Provider retries are safe.
4. **Subscription-payment link**: every `payment.status='succeeded'` for a
   `subscription_id` produces a single ledger top-up row. Enforced by upsert
   pattern in `billing_service.handle_payment_success`.

## Cancellation policy

| When student cancels | Credit fate                                    | Penalty           |
|----------------------|------------------------------------------------|-------------------|
| ≥24h before          | Refunded to ledger (`reason='cancellation_refund'`) | None              |
| <24h before          | Consumed (no refund)                           | None (or branch-configurable) |
| No-show (`absent` not excused) | Consumed                                | None              |

Branch managers can override on case-by-case basis (audit logged).

## Freeze rules

A subscription can be frozen for up to N days per period (default 14 days /
quarter). Frozen window:
- No lessons scheduled for the student in groups they're enrolled in (handled by
  scheduler).
- `expires_at` extends by the freeze duration.
- Ledger gets `freeze_refund` rows for any auto-scheduled lessons skipped.

## Receipt (54-FZ)

Every `payment.status='succeeded'` triggers receipt issuance via the acquiring
provider's online cash integration. We don't store the receipt content —
provider keeps it. We store `payment.provider_ref` for audit.

## Frontend integration points (Phase 2)

- `pages/student/SubscriptionPage.tsx` — current balance, history, freeze button.
- `pages/parent/PaymentsPage.tsx` — list payments, download receipts, top-up.
- `pages/admin/RevenuePage.tsx` — branch revenue, churn, refund queue.

## Why a ledger and not just a counter

A naked `lessons_remaining` int in `subscription` would lose history: refund
reasons, who issued bonus credits, when corrections happened. Audit, dispute
resolution, and analytics demand append-only history. The denormalized
`subscription.lessons_remaining` is a cache for fast UI; recomputed nightly and
on every ledger insert via service-layer code.
