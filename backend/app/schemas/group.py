from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.group import GroupMode, GroupStatus


class ScheduleSlotIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    valid_from: date
    valid_to: date | None = None


class ScheduleSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    group_id: UUID
    weekday: int
    start_time: time
    end_time: time
    valid_from: date
    valid_to: date | None


class GroupCreate(BaseModel):
    course_id: UUID
    branch_id: UUID | None = None
    teacher_id: UUID | None = None
    mode: GroupMode = GroupMode.offline
    start_date: date
    end_date: date | None = None
    max_students: int = Field(ge=1, le=30, default=12)
    slots: list[ScheduleSlotIn] = Field(default_factory=list)


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    course_id: UUID
    branch_id: UUID | None
    teacher_id: UUID | None
    mode: GroupMode
    start_date: date
    end_date: date | None
    max_students: int
    status: GroupStatus
    created_at: datetime


class GroupDetail(GroupOut):
    slots: list[ScheduleSlotOut] = Field(default_factory=list)


class EnrollmentIn(BaseModel):
    student_id: UUID


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    student_id: UUID
    group_id: UUID
    enrolled_at: datetime
    left_at: datetime | None
