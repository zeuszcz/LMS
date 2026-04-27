from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class Language(str, enum.Enum):
    en = "en"
    de = "de"
    fr = "fr"
    it = "it"
    es = "es"
    zh = "zh"
    ja = "ja"
    ko = "ko"


class CefrLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class AgeGroup(str, enum.Enum):
    kids = "kids"
    teens = "teens"
    adults = "adults"


class Course(Base, UUIDPKMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "course"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    language: Mapped[Language] = mapped_column(
        Enum(Language, name="course_language"), nullable=False, index=True
    )
    level: Mapped[CefrLevel] = mapped_column(
        Enum(CefrLevel, name="course_cefr_level"), nullable=False, index=True
    )
    age_group: Mapped[AgeGroup] = mapped_column(
        Enum(AgeGroup, name="course_age_group"), nullable=False, index=True
    )
    duration_weeks: Mapped[int] = mapped_column(Integer, nullable=False)
    lessons_count: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    methodology: Mapped[str | None] = mapped_column(String(50), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
