from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.course import AgeGroup, CefrLevel, Language


class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    order_index: int
    title: str
    summary: str | None
    lessons_count: int


class FeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    icon: str | None
    title: str
    description: str | None
    order_index: int


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    author_name: str
    rating: int
    body: str
    created_at: datetime


class GroupForCourse(BaseModel):
    """Compact group preview for the course landing's "join a group" section."""
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    branch_id: UUID | None
    teacher_id: UUID | None
    mode: str
    start_date: str
    max_students: int
    enrolled_count: int


class CourseDetail(BaseModel):
    id: UUID
    title: str
    language: Language
    level: CefrLevel
    age_group: AgeGroup
    duration_weeks: int
    lessons_count: int
    description: str | None
    methodology: str | None
    published_at: datetime | None
    created_at: datetime

    modules: list[ModuleOut] = Field(default_factory=list)
    features: list[FeatureOut] = Field(default_factory=list)
    reviews: list[ReviewOut] = Field(default_factory=list)
    avg_rating: float | None = None
    reviews_count: int = 0
    available_groups: list[GroupForCourse] = Field(default_factory=list)
