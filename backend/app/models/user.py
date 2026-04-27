from __future__ import annotations

import enum
from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from app.models.branch import Branch


class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    parent = "parent"
    methodist = "methodist"
    branch_manager = "branch_manager"
    admin = "admin"
    b2b_coordinator = "b2b_coordinator"


class CefrLevelEnum(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class User(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "user"

    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    locale: Mapped[str] = mapped_column(String(10), default="ru", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Europe/Moscow", nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    roles: Mapped[list["UserRoleAssignment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    student_profile: Mapped["StudentProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    teacher_profile: Mapped["TeacherProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )


class UserRoleAssignment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "user_role"
    __table_args__ = (UniqueConstraint("user_id", "role", "branch_id", name="uq_user_role_branch"),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role_kind"), nullable=False)
    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branch.id", ondelete="SET NULL"), nullable=True, index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="roles")
    branch: Mapped["Branch | None"] = relationship()


class StudentProfile(Base, TimestampMixin):
    __tablename__ = "student_profile"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    birthdate: Mapped[date | None] = mapped_column(Date, nullable=True)
    cefr_level: Mapped[CefrLevelEnum | None] = mapped_column(
        Enum(CefrLevelEnum, name="cefr_level_kind"), nullable=True
    )
    target_exam: Mapped[str | None] = mapped_column(String(50), nullable=True)
    learning_goals: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    user: Mapped["User"] = relationship(back_populates="student_profile")


class TeacherProfile(Base, TimestampMixin):
    __tablename__ = "teacher_profile"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    bio: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    cambridge_cert: Mapped[str | None] = mapped_column(String(50), nullable=True)
    hourly_rate_minor: Mapped[int | None] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship(back_populates="teacher_profile")


class ParentLink(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "parent_link"
    __table_args__ = (
        UniqueConstraint("parent_user_id", "student_user_id", name="uq_parent_student"),
    )

    parent_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_user_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    relation: Mapped[str] = mapped_column(String(20), default="parent", nullable=False)
    is_primary_contact: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    consent_signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
