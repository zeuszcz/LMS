from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=200)
    locale: str = "ru"
    timezone: str = "Europe/Moscow"
    roles: list[UserRole] = Field(default_factory=lambda: [UserRole.student])


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str | None
    phone: str | None
    full_name: str
    locale: str
    timezone: str
    is_superuser: bool
    last_seen_at: datetime | None
    created_at: datetime
