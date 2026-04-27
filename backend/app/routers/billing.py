from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.billing import LessonCreditLedger, Payment, PricingPlan, Subscription
from app.models.user import ParentLink
from app.schemas.billing import (
    LedgerRowOut,
    PaymentOut,
    PricingPlanOut,
    SubscriptionOut,
)
from app.services import permissions

router = APIRouter()


async def _student_visible_to(user, student_id: UUID, db: AsyncSession) -> bool:
    if permissions.is_admin(user) or permissions.is_methodist(user):
        return True
    if user.id == student_id:
        return True
    if permissions.is_parent(user):
        result = await db.execute(
            select(ParentLink.student_user_id).where(
                ParentLink.parent_user_id == user.id,
                ParentLink.student_user_id == student_id,
            )
        )
        return result.scalar_one_or_none() is not None
    return False


@router.get("/plans", response_model=list[PricingPlanOut])
async def list_plans(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PricingPlan]:
    result = await db.execute(select(PricingPlan).order_by(PricingPlan.price_minor))
    return list(result.scalars().all())


@router.get("/subscriptions/{student_id}", response_model=list[SubscriptionOut])
async def student_subscriptions(
    student_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Subscription]:
    if not await _student_visible_to(user, student_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    result = await db.execute(
        select(Subscription)
        .where(Subscription.student_id == student_id)
        .order_by(Subscription.started_at.desc())
    )
    return list(result.scalars().all())


@router.get("/subscriptions/{subscription_id}/ledger", response_model=list[LedgerRowOut])
async def subscription_ledger(
    subscription_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[LessonCreditLedger]:
    sub_res = await db.execute(select(Subscription).where(Subscription.id == subscription_id))
    sub = sub_res.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
    if not await _student_visible_to(user, sub.student_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    result = await db.execute(
        select(LessonCreditLedger)
        .where(LessonCreditLedger.subscription_id == subscription_id)
        .order_by(LessonCreditLedger.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/payments/{student_id}", response_model=list[PaymentOut])
async def student_payments(
    student_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Payment]:
    if not await _student_visible_to(user, student_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    result = await db.execute(
        select(Payment)
        .where(Payment.student_id == student_id)
        .order_by(Payment.created_at.desc())
    )
    return list(result.scalars().all())
