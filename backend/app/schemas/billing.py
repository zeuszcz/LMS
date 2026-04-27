from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.billing import (
    LedgerReason,
    PaymentStatus,
    PricingPlanKind,
    SubscriptionStatus,
)


class PricingPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    kind: PricingPlanKind
    lessons_included: int
    price_minor: int
    currency: str


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    student_id: UUID
    pricing_plan_id: UUID
    started_at: datetime
    expires_at: datetime | None
    lessons_remaining: int
    status: SubscriptionStatus


class LedgerRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    subscription_id: UUID
    delta: int
    reason: LedgerReason
    lesson_instance_id: UUID | None
    payment_id: UUID | None
    created_at: datetime


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    student_id: UUID
    subscription_id: UUID | None
    amount_minor: int
    currency: str
    provider: str
    status: PaymentStatus
    paid_at: datetime | None
    created_at: datetime
