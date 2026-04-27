"""Aggregated student progress: attendance %, homework score, summary."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.assignment import Submission, SubmissionStatus
from app.models.group import Enrollment
from app.models.lesson import Attendance, AttendanceStatus
from app.models.user import ParentLink
from app.services import permissions

router = APIRouter()


class ProgressOut(BaseModel):
    student_id: UUID
    enrollments: int
    lessons_total: int
    lessons_attended: int
    attendance_rate: float
    homework_total: int
    homework_submitted: int
    homework_graded: int
    avg_score: float | None


async def _can_view(user, student_id: UUID, db: AsyncSession) -> bool:
    if permissions.is_admin(user) or permissions.is_methodist(user) or permissions.is_teacher(user):
        return True
    if user.id == student_id:
        return True
    if permissions.is_parent(user):
        result = await db.execute(
            select(ParentLink).where(
                ParentLink.parent_user_id == user.id,
                ParentLink.student_user_id == student_id,
            )
        )
        return result.scalar_one_or_none() is not None
    return False


@router.get("/{student_id}", response_model=ProgressOut)
async def student_progress(
    student_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProgressOut:
    if not await _can_view(user, student_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    enr_count = (
        await db.execute(
            select(func.count())
            .select_from(Enrollment)
            .where(Enrollment.student_id == student_id, Enrollment.left_at.is_(None))
        )
    ).scalar_one()

    att_total = (
        await db.execute(
            select(func.count()).select_from(Attendance).where(Attendance.student_id == student_id)
        )
    ).scalar_one()
    att_present = (
        await db.execute(
            select(func.count())
            .select_from(Attendance)
            .where(
                Attendance.student_id == student_id,
                Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
            )
        )
    ).scalar_one()

    sub_q = select(Submission).where(Submission.student_id == student_id)
    sub_total = (await db.execute(select(func.count()).select_from(sub_q.subquery()))).scalar_one()
    sub_submitted = (
        await db.execute(
            select(func.count()).select_from(
                sub_q.where(
                    Submission.status.in_(
                        [SubmissionStatus.submitted, SubmissionStatus.graded]
                    )
                ).subquery()
            )
        )
    ).scalar_one()
    sub_graded = (
        await db.execute(
            select(func.count()).select_from(
                sub_q.where(Submission.status == SubmissionStatus.graded).subquery()
            )
        )
    ).scalar_one()
    avg = (
        await db.execute(
            select(func.avg(Submission.score)).where(
                Submission.student_id == student_id,
                Submission.status == SubmissionStatus.graded,
            )
        )
    ).scalar_one()

    rate = float(att_present) / att_total if att_total else 0.0
    return ProgressOut(
        student_id=student_id,
        enrollments=enr_count,
        lessons_total=att_total,
        lessons_attended=att_present,
        attendance_rate=round(rate, 2),
        homework_total=sub_total,
        homework_submitted=sub_submitted,
        homework_graded=sub_graded,
        avg_score=float(avg) if avg is not None else None,
    )
