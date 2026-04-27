from __future__ import annotations

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class CourseModule(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    """Curriculum module — a thematic block of lessons in a course (e.g.,
    "Past Tenses", "Travel & Culture").
    """

    __tablename__ = "course_module"
    __table_args__ = (
        UniqueConstraint("course_id", "order_index", name="uq_course_module_order"),
    )

    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("course.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    lessons_count: Mapped[int] = mapped_column(Integer, default=4, nullable=False)


class CourseFeature(Base, UUIDPKMixin, TimestampMixin):
    """Bullet-point selling feature ("Носитель языка", "Cambridge testing")."""

    __tablename__ = "course_feature"

    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("course.id", ondelete="CASCADE"), nullable=False, index=True
    )
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(400), nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class CourseReview(Base, UUIDPKMixin, TimestampMixin):
    """Student testimonial about a course."""

    __tablename__ = "course_review"

    course_id: Mapped[UUID] = mapped_column(
        ForeignKey("course.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )
    author_name: Mapped[str] = mapped_column(String(120), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..5
    body: Mapped[str] = mapped_column(String(2000), nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
