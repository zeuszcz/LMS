from __future__ import annotations

from datetime import date, time
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Integer, Time
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class ScheduleSlot(Base, UUIDPKMixin, TimestampMixin):
    """Recurring weekly slot for a study group.

    `weekday` is 0=Monday..6=Sunday (matches Python `datetime.weekday()`).
    """

    __tablename__ = "schedule_slot"

    group_id: Mapped[UUID] = mapped_column(
        ForeignKey("study_group.id", ondelete="CASCADE"), nullable=False, index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)
