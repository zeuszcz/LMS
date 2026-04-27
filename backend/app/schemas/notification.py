from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationChannel, NotificationStatus


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    channel: NotificationChannel
    template_code: str
    subject: str | None
    body: str
    scheduled_at: datetime
    sent_at: datetime | None
    read_at: datetime | None
    status: NotificationStatus
    created_at: datetime


class NotificationList(BaseModel):
    items: list[NotificationOut]
    unread: int
