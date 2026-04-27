from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.lesson import LessonStatus


class ModuleLessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    sequence: int
    title: str
    summary: str | None
    content_md: str | None
    duration_min: int
    status: LessonStatus
    scheduled_at: datetime
    is_completed: bool


class ModuleProgress(BaseModel):
    course_id: UUID
    module_order: int
    module_title: str
    module_summary: str | None
    group_id: UUID | None  # null if student not enrolled in any group
    enrolled: bool
    lessons: list[ModuleLessonOut]
    completed: int
    total: int
