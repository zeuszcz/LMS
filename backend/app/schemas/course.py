from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.course import AgeGroup, CefrLevel, Language


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    language: Language
    level: CefrLevel
    age_group: AgeGroup
    duration_weeks: int = Field(ge=1, le=104)
    lessons_count: int = Field(ge=1, le=500)
    description: str | None = Field(default=None, max_length=4000)
    methodology: str | None = Field(default=None, max_length=50)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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


class CourseList(BaseModel):
    items: list[CourseOut]
    total: int
