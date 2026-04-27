from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class EnrollmentRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class EnrollmentRequest(Base, UUIDPKMixin, TimestampMixin):
    """Student-initiated request to join a study group.

    A pending request becomes an actual `enrollment` row when an admin
    or methodist approves it.
    """

    __tablename__ = "enrollment_request"
    __table_args__ = (
        UniqueConstraint(
            "student_id", "group_id", "status",
            name="uq_enrollment_request_student_group_status",
        ),
    )

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[UUID] = mapped_column(
        ForeignKey("study_group.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[EnrollmentRequestStatus] = mapped_column(
        Enum(EnrollmentRequestStatus, name="enrollment_request_status"),
        default=EnrollmentRequestStatus.pending,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    processed_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decision_reason: Mapped[str | None] = mapped_column(String(2000), nullable=True)
