from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enrollment_request import EnrollmentRequestStatus


class EnrollmentRequestCreate(BaseModel):
    group_id: UUID
    note: str | None = Field(default=None, max_length=2000)


class EnrollmentRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    student_id: UUID
    group_id: UUID
    status: EnrollmentRequestStatus
    note: str | None
    processed_by: UUID | None
    processed_at: datetime | None
    decision_reason: str | None
    created_at: datetime


class DecisionIn(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)
