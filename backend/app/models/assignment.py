from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class AssignmentKind(str, enum.Enum):
    quiz = "quiz"
    writing = "writing"
    speaking = "speaking"
    reading = "reading"


class SubmissionStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    graded = "graded"
    returned = "returned"


class Assignment(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "assignment"

    lesson_instance_id: Mapped[UUID] = mapped_column(
        ForeignKey("lesson_instance.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[AssignmentKind] = mapped_column(
        Enum(AssignmentKind, name="assignment_kind"), nullable=False
    )
    instructions: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_score: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    auto_check: Mapped[bool] = mapped_column(default=False, nullable=False)


class Submission(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "submission"

    assignment_id: Mapped[UUID] = mapped_column(
        ForeignKey("assignment.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attempt_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, name="submission_status"),
        default=SubmissionStatus.draft,
        nullable=False,
    )
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    rubric: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    graded_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
