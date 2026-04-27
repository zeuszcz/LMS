from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.lesson import AttendanceStatus, LessonStatus


class LessonCreate(BaseModel):
    group_id: UUID
    sequence: int = Field(ge=1, le=500)
    title: str = Field(min_length=1, max_length=200)
    scheduled_at: datetime
    duration_min: int = Field(ge=15, le=240, default=60)


class LessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    group_id: UUID
    sequence: int
    title: str
    scheduled_at: datetime
    duration_min: int
    actual_started_at: datetime | None
    actual_ended_at: datetime | None
    status: LessonStatus


class AttendanceIn(BaseModel):
    student_id: UUID
    status: AttendanceStatus
    participation_score: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class AttendanceBulkIn(BaseModel):
    entries: list[AttendanceIn]


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    lesson_instance_id: UUID
    student_id: UUID
    status: AttendanceStatus
    participation_score: int | None
    comment: str | None


class LessonClose(BaseModel):
    """Bulk close: pass attendance for every enrolled student."""
    attendance: list[AttendanceIn]
    notes_for_methodist: str | None = Field(default=None, max_length=4000)
