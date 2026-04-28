"""Celery worker for background tasks (notifications retry, periodic jobs).

Run locally:
    uv run celery -A app.worker:celery_app worker -B -l info

In production: a separate process beside uvicorn.
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import structlog
from celery import Celery
from celery.schedules import crontab
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.notification import (
    NotificationChannel,
    NotificationOutbox,
    NotificationStatus,
)

logger = structlog.get_logger(__name__)

celery_app = Celery(
    "yes_lms",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "retry-pending-notifications": {
            "task": "app.worker.retry_pending_notifications",
            "schedule": crontab(minute="*/5"),  # every 5 min
        },
    },
)


@celery_app.task(name="app.worker.retry_pending_notifications", bind=True, max_retries=3)
def retry_pending_notifications(self) -> dict:
    """Re-attempt delivery for failed/pending notifications older than 1 minute,
    up to 5 retries each. Returns counts."""
    return asyncio.run(_retry_pending_async())


async def _retry_pending_async() -> dict:
    from app.services.notifier import deliver_email
    from app.models.user import User

    cutoff = datetime.now(UTC) - timedelta(minutes=1)
    sent = 0
    failed = 0
    skipped = 0

    async with SessionLocal() as db:
        res = await db.execute(
            select(NotificationOutbox).where(
                NotificationOutbox.status.in_(
                    [NotificationStatus.pending, NotificationStatus.failed]
                ),
                NotificationOutbox.scheduled_at <= cutoff,
                NotificationOutbox.retry_count < 5,
            ).limit(50)
        )
        rows = list(res.scalars().all())

        for n in rows:
            if n.channel != NotificationChannel.email:
                # in-app/telegram are written by other paths; nothing to retry here
                skipped += 1
                continue

            user_res = await db.execute(select(User).where(User.id == n.user_id))
            user = user_res.scalar_one_or_none()
            if not user or not user.email:
                n.status = NotificationStatus.failed
                n.last_error = "user has no email"
                failed += 1
                continue

            await deliver_email(db, n, user.email)
            if n.status == NotificationStatus.delivered:
                sent += 1
            else:
                failed += 1

        await db.commit()

    logger.info("notifications_retry", sent=sent, failed=failed, skipped=skipped)
    return {"sent": sent, "failed": failed, "skipped": skipped}


@celery_app.task(name="app.worker.send_email_async")
def send_email_async(to: str, subject: str, body: str) -> bool:
    """Fire-and-forget email send used by hot paths if the inline send fails."""
    from app.services.notifier import _send_email_blocking

    try:
        _send_email_blocking(to, subject, body)
        return True
    except Exception as exc:
        logger.warning("celery_email_failed", to=to, error=str(exc))
        return False
