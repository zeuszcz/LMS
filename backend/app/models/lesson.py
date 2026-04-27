from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, PrimaryKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class LessonStatus(str, enum.Enum):
    planned = "planned"
    in_progress = "in_progress"
    finished = "finished"
    cancelled = "cancelled"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"
    excused = "excused"


class LessonInstance(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "lesson_instance"

    group_id: Mapped[UUID] = mapped_column(
        ForeignKey("study_group.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_min: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    actual_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[LessonStatus] = mapped_column(
        Enum(LessonStatus, name="lesson_status"), default=LessonStatus.planned, nullable=False
    )
    notes_for_methodist: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    # Markdown body shown to students in the lesson learning view
    content_md: Mapped[str | None] = mapped_column(String(20000), nullable=True)
    summary: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"
    __table_args__ = (
        PrimaryKeyConstraint("lesson_instance_id", "student_id", name="pk_attendance"),
    )

    lesson_instance_id: Mapped[UUID] = mapped_column(
        ForeignKey("lesson_instance.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    participation_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    recorded_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
