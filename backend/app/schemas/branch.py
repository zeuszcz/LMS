from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BranchCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=32)
    timezone: str = "Europe/Moscow"
    manager_user_id: UUID | None = None


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    address: str
    city: str
    phone: str | None
    timezone: str
    manager_user_id: UUID | None
    created_at: datetime
