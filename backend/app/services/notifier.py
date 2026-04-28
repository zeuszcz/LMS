"""Notification dispatch — email via SMTP (MailHog locally), Telegram + outbox.

In production the SMTP host is a real provider; in dev it points at MailHog
on :1025 — every email is visible at http://localhost:8025.
"""
from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.notification import (
    NotificationChannel,
    NotificationOutbox,
    NotificationStatus,
)

logger = structlog.get_logger(__name__)


def _send_email_blocking(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as s:
            if settings.smtp_user and settings.smtp_password:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
    except Exception as exc:  # noqa: BLE001
        logger.warning("smtp_send_failed", to=to, error=str(exc))
        raise


async def send_email(to: str, subject: str, body: str) -> None:
    """Async wrapper — runs blocking smtplib in a thread pool."""
    await asyncio.to_thread(_send_email_blocking, to, subject, body)


async def queue_notification(
    db: AsyncSession,
    *,
    user_id: UUID,
    channel: NotificationChannel,
    template_code: str,
    subject: str,
    body: str,
    scheduled_at=None,
) -> NotificationOutbox:
    from datetime import UTC, datetime

    n = NotificationOutbox(
        user_id=user_id,
        channel=channel,
        template_code=template_code,
        subject=subject,
        body=body,
        scheduled_at=scheduled_at or datetime.now(UTC),
        status=NotificationStatus.pending,
    )
    db.add(n)
    return n


async def deliver_email(
    db: AsyncSession,
    notification: NotificationOutbox,
    to: str,
) -> None:
    """Mark sent + deliver via SMTP. Failures keep the row pending for retry."""
    from datetime import UTC, datetime

    try:
        await send_email(to, notification.subject or "YES Center", notification.body)
        notification.status = NotificationStatus.delivered
        notification.sent_at = datetime.now(UTC)
    except Exception as exc:  # noqa: BLE001
        notification.status = NotificationStatus.failed
        notification.last_error = str(exc)[:1900]
        notification.retry_count += 1


async def notify_enrollment_decision(
    db: AsyncSession,
    *,
    student_id: UUID,
    student_email: str | None,
    student_name: str,
    course_title: str,
    approved: bool,
    reason: str | None,
) -> None:
    """In-app + email (if address) + telegram outbox row."""
    if approved:
        subject = f"Заявка одобрена: {course_title}"
        body = (
            f"Здравствуйте, {student_name}!\n\n"
            f"Ваша заявка на курс «{course_title}» одобрена. "
            f"Откройте кабинет — расписание уроков и материалы уже там.\n\n"
            f"{reason or ''}\n\n"
            f"— Команда YES Center"
        )
        template = "enrollment_approved"
    else:
        subject = f"Заявка отклонена: {course_title}"
        body = (
            f"Здравствуйте, {student_name}.\n\n"
            f"К сожалению, ваша заявка на курс «{course_title}» отклонена.\n\n"
            f"Причина: {reason or 'не указана'}\n\n"
            f"Свяжитесь с методистом — подберём другую группу.\n\n"
            f"— Команда YES Center"
        )
        template = "enrollment_rejected"

    # In-app
    in_app = await queue_notification(
        db,
        user_id=student_id,
        channel=NotificationChannel.in_app,
        template_code=template,
        subject=subject,
        body=body,
    )
    in_app.status = NotificationStatus.delivered  # in-app is "delivered" instantly

    # Telegram outbox row (no real send — picked up by a worker in prod)
    await queue_notification(
        db,
        user_id=student_id,
        channel=NotificationChannel.telegram,
        template_code=template,
        subject=subject,
        body=body,
    )

    # Email (if address)
    if student_email:
        email_n = await queue_notification(
            db,
            user_id=student_id,
            channel=NotificationChannel.email,
            template_code=template,
            subject=subject,
            body=body,
        )
        await db.flush()
        await deliver_email(db, email_n, student_email)
