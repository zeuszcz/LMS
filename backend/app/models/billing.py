from __future__ import annotations

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPKMixin


class PricingPlanKind(str, enum.Enum):
    per_lesson = "per_lesson"
    package = "package"
    subscription = "subscription"


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    paused = "paused"
    expired = "expired"
    refunded = "refunded"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class LedgerReason(str, enum.Enum):
    purchase = "purchase"
    lesson_debit = "lesson_debit"
    freeze_refund = "freeze_refund"
    cancellation_refund = "cancellation_refund"
    bonus = "bonus"
    correction = "correction"


class PricingPlan(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "pricing_plan"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    kind: Mapped[PricingPlanKind] = mapped_column(
        Enum(PricingPlanKind, name="pricing_plan_kind"), nullable=False
    )
    lessons_included: Mapped[int] = mapped_column(Integer, nullable=False)
    price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="RUB", nullable=False)
    branch_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("branch.id", ondelete="SET NULL"), nullable=True
    )
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Subscription(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "subscription"

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    pricing_plan_id: Mapped[UUID] = mapped_column(
        ForeignKey("pricing_plan.id", ondelete="RESTRICT"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lessons_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    frozen_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    frozen_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status"),
        default=SubscriptionStatus.active,
        nullable=False,
    )


class LessonCreditLedger(Base, UUIDPKMixin, TimestampMixin):
    """Append-only ledger of lesson credit deltas."""

    __tablename__ = "lesson_credit_ledger"

    subscription_id: Mapped[UUID] = mapped_column(
        ForeignKey("subscription.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lesson_instance_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("lesson_instance.id", ondelete="SET NULL"), nullable=True
    )
    payment_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("payment.id", ondelete="SET NULL"), nullable=True
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[LedgerReason] = mapped_column(
        Enum(LedgerReason, name="ledger_reason"), nullable=False
    )
    created_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("user.id", ondelete="SET NULL"), nullable=True
    )


class Payment(Base, UUIDPKMixin, TimestampMixin):
    __tablename__ = "payment"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_payment_idempotency_key"),
    )

    student_id: Mapped[UUID] = mapped_column(
        ForeignKey("user.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    subscription_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("subscription.id", ondelete="SET NULL"), nullable=True
    )
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="RUB", nullable=False)
    provider: Mapped[str] = mapped_column(String(30), default="manual", nullable=False)
    provider_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.pending,
        nullable=False,
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
