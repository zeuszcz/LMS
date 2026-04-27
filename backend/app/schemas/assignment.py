from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.assignment import AssignmentKind, SubmissionStatus


class AssignmentCreate(BaseModel):
    lesson_instance_id: UUID
    title: str = Field(min_length=1, max_length=200)
    kind: AssignmentKind
    instructions: str | None = Field(default=None, max_length=4000)
    payload: dict[str, Any] | None = None
    due_at: datetime | None = None
    max_score: int = Field(ge=1, le=100, default=10)
    auto_check: bool = False


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    lesson_instance_id: UUID
    title: str
    kind: AssignmentKind
    instructions: str | None
    due_at: datetime | None
    max_score: int
    auto_check: bool
    created_at: datetime


class SubmissionIn(BaseModel):
    payload: dict[str, Any] | None = None
    submit: bool = False  # if true, transitions draft → submitted


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    assignment_id: UUID
    student_id: UUID
    submitted_at: datetime | None
    attempt_no: int
    status: SubmissionStatus
    score: int | None
    feedback: str | None
    graded_at: datetime | None


class GradeIn(BaseModel):
    score: int = Field(ge=0, le=100)
    feedback: str | None = Field(default=None, max_length=4000)
    rubric: dict[str, Any] | None = None
