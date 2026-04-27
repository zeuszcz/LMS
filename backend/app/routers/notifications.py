from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.notification import NotificationOutbox
from app.schemas.notification import NotificationList, NotificationOut

router = APIRouter()


@router.get("/", response_model=NotificationList)
async def list_notifications(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> NotificationList:
    stmt = (
        select(NotificationOutbox)
        .where(NotificationOutbox.user_id == user.id)
        .order_by(NotificationOutbox.created_at.desc())
        .limit(min(limit, 200))
    )
    items = list((await db.execute(stmt)).scalars().all())
    unread = (
        await db.execute(
            select(func.count())
            .select_from(NotificationOutbox)
            .where(NotificationOutbox.user_id == user.id, NotificationOutbox.read_at.is_(None))
        )
    ).scalar_one()
    return NotificationList(
        items=[NotificationOut.model_validate(i) for i in items],
        unread=unread,
    )


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(
    notification_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationOutbox:
    res = await db.execute(
        select(NotificationOutbox).where(
            NotificationOutbox.id == notification_id,
            NotificationOutbox.user_id == user.id,
        )
    )
    n = res.scalar_one_or_none()
    if n is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(n)
    return n
