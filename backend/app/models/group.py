from __future__ import annotations

import enum
from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class GroupMode(str, enum.Enum):
    offline = "offline"
    online = "online"
    hybrid = "hybrid"


class GroupStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    finished = "finished"
    cancelled = "cancelled"


class Group(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "study_group"

    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("course.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branch.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True, index=True
    )
    room_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("room.id", ondelete="SET NULL"), nullable=True
    )
    mode: Mapped[GroupMode] = mapped_column(Enum(GroupMode, name="group_mode"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    max_students: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    status: Mapped[GroupStatus] = mapped_column(
        Enum(GroupStatus, name="group_status"), default=GroupStatus.planned, nullable=False
    )


class Enrollment(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "enrollment"
    __table_args__ = (
        UniqueConstraint("student_id", "group_id", name="uq_enrollment_student_group"),
    )

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[UUID] = mapped_column(
        ForeignKey("study_group.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    placement_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    final_grade: Mapped[int | None] = mapped_column(Integer, nullable=True)
