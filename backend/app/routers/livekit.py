"""Issue LiveKit access tokens for video classrooms.

Each lesson maps to a LiveKit room: `lesson-<lesson_id>`. Teachers/methodists
get publish+subscribe; students get subscribe + publish (audio/video on for
speaking practice).
"""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.config import settings
from app.core.database import get_db
from app.models.group import Enrollment, Group
from app.models.lesson import LessonInstance
from app.services import permissions

try:
    from livekit import api as lk_api  # type: ignore
    LIVEKIT_OK = True
except ImportError:
    LIVEKIT_OK = False

router = APIRouter()


class LiveKitToken(BaseModel):
    url: str
    token: str
    room: str
    identity: str
    role: str  # "teacher" | "student"


@router.get("/lesson/{lesson_id}/token", response_model=LiveKitToken)
async def lesson_token(
    lesson_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LiveKitToken:
    if not LIVEKIT_OK:
        raise HTTPException(503, detail="LiveKit SDK not installed")
    if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
        raise HTTPException(
            503,
            detail="LiveKit not configured — set LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET",
        )

    lesson_res = await db.execute(select(LessonInstance).where(LessonInstance.id == lesson_id))
    lesson = lesson_res.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(404, detail="Lesson not found")

    group_res = await db.execute(select(Group).where(Group.id == lesson.group_id))
    group = group_res.scalar_one_or_none()
    if group is None:
        raise HTTPException(404, detail="Group missing")

    is_teacher_or_staff = (
        permissions.is_admin(user)
        or permissions.is_methodist(user)
        or (group.teacher_id is not None and group.teacher_id == user.id)
    )
    if not is_teacher_or_staff:
        # student must be enrolled in this lesson's group
        enrolled = await db.execute(
            select(Enrollment).where(
                Enrollment.student_id == user.id,
                Enrollment.group_id == group.id,
                Enrollment.left_at.is_(None),
                Enrollment.deleted_at.is_(None),
            )
        )
        if enrolled.scalar_one_or_none() is None:
            raise HTTPException(403, detail="Сначала запишитесь в группу")

    role = "teacher" if is_teacher_or_staff else "student"
    room_name = f"lesson-{lesson_id}"
    identity = f"{role}-{user.id}"

    grant = lk_api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
        room_admin=is_teacher_or_staff,
    )
    token = (
        lk_api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(identity)
        .with_name(user.full_name)
        .with_grants(grant)
        .with_ttl(60 * 60 * 4)  # 4 hours
        .to_jwt()
    )

    return LiveKitToken(
        url=settings.livekit_url,
        token=token,
        room=room_name,
        identity=identity,
        role=role,
    )
