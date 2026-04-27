# Integrations

External systems we depend on, their contracts, failure modes, and the layer
isolating them from the rest of the codebase.

## Adapter pattern

Every integration lives under `app/services/integrations/<vendor>/`:
- `client.py` — thin transport (httpx / SDK)
- `models.py` — Pydantic types matching vendor payloads
- `service.py` — business-shaped methods (`init_payment`, `register_invoice`)
- `webhooks.py` — inbound handlers (signature verification + idempotency)
- `errors.py` — typed exceptions
- `tests/` — VCR cassettes or mocked HTTP

Routers call `service.py` only. No router imports `client.py` directly. This
keeps the vendor swap-out (e.g., YooKassa → CloudPayments) localized.

## Integrations roster

### 1. 1С (CRM/Бухгалтерия)

**Goal**: bidirectional sync of students, subscriptions, payments.

| MVP                       | Phase 2                                  |
|---------------------------|------------------------------------------|
| CSV import of students     | REST API both ways                        |
| Email export of new payments | Webhook on payment events to 1C         |

Endpoints (Phase 2):
- `GET /students?modified_since=` — incremental pull
- `POST /payments` — push our payment to 1C
- `GET /pricing-plans` — pull current tariffs
- `POST /subscriptions/freeze` — propagate freeze

**SLA**: p95 < 800ms, 99.5% in business hours. **Auth**: mTLS or OAuth2 client
credentials. **IPs whitelisted** at 1C side.

### 2. YooKassa (acquiring)

**Goal**: card / СБП / Apple/Google Pay payments + recurring + receipts (54-FZ).

- API: REST, idempotent via `Idempotence-Key` header.
- Webhooks: signed (`Yookassa-Signature` HMAC); we verify before processing.
- Receipt: passed in payment-creation payload; YooKassa registers via online cash.
- Refunds: full or partial via API; reflected in ledger as `cancellation_refund`.

**Critical**: webhook handler must be idempotent on `event_id`. We persist
processed event IDs in Redis with 30-day TTL.

### 3. LiveKit (video)

**Goal**: video classroom, up to 12 participants, server-side recording.

- Self-hosted in Yandex Cloud RU (compliance with 152-FZ for kids' video).
- React SDK on frontend; Python SDK in `integrations/livekit` for room
  provisioning + JWT issuance.
- Recording stored in MinIO/S3 RU bucket; consent must exist before start.
- Telemetry (RTT, packet loss) ingested to ClickHouse for quality dashboards
  (Phase 3).

### 4. Telegram (bot)

**Goal**: notifications + light chat (parent ↔ teacher).

- Single bot @yes_lms_bot (one token).
- Deep-link `t.me/yes_lms_bot?start=<linking_token>` ties Telegram chat_id to user.
- Webhook mode (not polling), reverse proxy in front.
- Rate: 30 msg/sec global; queue via `notification_outbox`.

### 5. SMS

**Goal**: critical fallback (lesson cancelled by teacher, sms-2FA recovery).

- Provider: SMSC.ru (or SMS.ru) — RU-based, A-category traffic.
- Sender ID: `YESCenter` (registered with operators).
- Delivery webhook → `notification_outbox.status='delivered'`.

### 6. Email

**Goal**: transactional letters (registration, password reset, parent reports,
receipt PDFs).

- Provider: UniSender Go (RU jurisdiction) or Mailgun (EU, if RU not strict).
- DKIM/SPF/DMARC configured for `yescenter.ru` mail subdomain.
- Bounce/complaint webhook → mark user email as bad, fall back to phone.

### 7. (Phase 3) Online Proctoring

**Goal**: anti-cheat for mock exams.

- Vendor TBD (ProctorEdu / Examus) — RFP only.
- Consent before exam start; video kept 30 days.

### 8. (Phase 3) Speech / Pronunciation Scoring

**Goal**: auto-feedback on speaking homework.

- Yandex SpeechKit (RU) or Azure Speech Pronunciation Assessment (EN).
- Scores 5 dimensions per Cambridge speaking rubric.

## Failure isolation

- All integration calls wrapped with timeout (5s default, 30s for video room
  creation).
- Circuit breaker (Phase 2) per vendor; opens after 5 failures in 1 min.
- Fallbacks documented per integration (e.g., notification: TG → email → SMS).
- No integration call from inside a DB transaction. Transactions stay short.

## Webhook security checklist

- [ ] HTTPS only.
- [ ] HMAC signature verified.
- [ ] Replay protection (event_id idempotency in Redis or DB).
- [ ] Body size limit (1 MB).
- [ ] Logging request_id correlation.
- [ ] Failed verification returns 401 (not 200) — but doesn't leak details.

## Why we keep vendor SDKs at arm's length

When a vendor changes their SDK in a breaking way (happens), or when we swap
vendors (1C → SaaS competitor; YooKassa → CloudPayments after pricing renegotiation),
the blast radius is one folder, not the whole service tree. The cost is a thin
adapter layer that everyone could "skip" — but skipping it pays back negatively
the moment the vendor blows up.
