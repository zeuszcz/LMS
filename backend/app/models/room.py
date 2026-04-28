from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class Room(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    """Physical classroom (or virtual room key for online groups)."""

    __tablename__ = "room"
    __table_args__ = (
        UniqueConstraint("branch_id", "name", name="uq_room_branch_name"),
    )

    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branch.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    equipment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
