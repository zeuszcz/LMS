from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.enrollment_request import EnrollmentRequest, EnrollmentRequestStatus
from app.models.group import Enrollment, Group
from app.schemas.enrollment_request import (
    DecisionIn,
    EnrollmentRequestCreate,
    EnrollmentRequestOut,
)
from app.services import permissions

router = APIRouter()


@router.post("/", response_model=EnrollmentRequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: EnrollmentRequestCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnrollmentRequest:
    group_res = await db.execute(select(Group).where(Group.id == payload.group_id))
    group = group_res.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    existing = await db.execute(
        select(EnrollmentRequest).where(
            EnrollmentRequest.student_id == user.id,
            EnrollmentRequest.group_id == payload.group_id,
            EnrollmentRequest.status == EnrollmentRequestStatus.pending,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Заявка на эту группу уже подана и ждёт рассмотрения",
        )

    already_enrolled = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.group_id == payload.group_id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    if already_enrolled.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Вы уже учитесь в этой группе",
        )

    req = EnrollmentRequest(
        student_id=user.id,
        group_id=payload.group_id,
        note=payload.note,
        status=EnrollmentRequestStatus.pending,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


@router.get("/", response_model=list[EnrollmentRequestOut])
async def list_requests(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: EnrollmentRequestStatus | None = None,
    student_id: UUID | None = None,
) -> list[EnrollmentRequest]:
    stmt = select(EnrollmentRequest)
    is_staff = (
        permissions.is_admin(user)
        or permissions.is_methodist(user)
        or permissions.is_branch_manager(user)
    )
    if not is_staff:
        # students only see own requests
        stmt = stmt.where(EnrollmentRequest.student_id == user.id)
    if student_id is not None:
        stmt = stmt.where(EnrollmentRequest.student_id == student_id)
    if status_filter is not None:
        stmt = stmt.where(EnrollmentRequest.status == status_filter)
    stmt = stmt.order_by(EnrollmentRequest.created_at.desc()).limit(200)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/me/active-enrollments", response_model=list[dict])
async def my_active_enrollments(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    """Compact list of the student's active enrollments + group + course title."""
    from app.models.course import Course

    stmt = (
        select(Enrollment, Group, Course)
        .join(Group, Group.id == Enrollment.group_id)
        .join(Course, Course.id == Group.course_id)
        .where(
            Enrollment.student_id == user.id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
        .order_by(Enrollment.enrolled_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    return [
        {
            "enrollment_id": str(e.id),
            "group_id": str(g.id),
            "course_id": str(c.id),
            "course_title": c.title,
            "language": c.language.value,
            "level": c.level.value,
            "started_at": e.enrolled_at.isoformat(),
        }
        for e, g, c in rows
    ]


async def _ensure_can_decide(user, db: AsyncSession, req: EnrollmentRequest) -> None:
    if permissions.is_admin(user) or permissions.is_methodist(user):
        return
    group_res = await db.execute(select(Group).where(Group.id == req.group_id))
    group = group_res.scalar_one_or_none()
    if group and permissions.is_branch_manager(user, group.branch_id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.post("/{request_id}/approve", response_model=EnrollmentRequestOut)
async def approve(
    request_id: UUID,
    payload: DecisionIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnrollmentRequest:
    res = await db.execute(select(EnrollmentRequest).where(EnrollmentRequest.id == request_id))
    req = res.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != EnrollmentRequestStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {req.status.value}",
        )

    await _ensure_can_decide(user, db, req)

    group_res = await db.execute(select(Group).where(Group.id == req.group_id))
    group = group_res.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group missing")

    enrolled_count = (
        await db.execute(
            select(func.count())
            .select_from(Enrollment)
            .where(Enrollment.group_id == group.id, Enrollment.left_at.is_(None))
        )
    ).scalar_one()
    if enrolled_count >= group.max_students:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Group is full — cannot approve",
        )

    duplicate = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == req.student_id,
            Enrollment.group_id == req.group_id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    if not duplicate.scalar_one_or_none():
        db.add(
            Enrollment(
                student_id=req.student_id,
                group_id=req.group_id,
                enrolled_at=datetime.now(UTC),
            )
        )
        await db.flush()

    req.status = EnrollmentRequestStatus.approved
    req.processed_by = user.id
    req.processed_at = datetime.now(UTC)
    req.decision_reason = payload.reason

    # Notifications
    from app.models.course import Course
    from app.models.user import User as UserModel
    from app.services.notifier import notify_enrollment_decision

    student_res = await db.execute(select(UserModel).where(UserModel.id == req.student_id))
    student = student_res.scalar_one_or_none()
    course_res = await db.execute(select(Course).where(Course.id == group.course_id))
    course = course_res.scalar_one_or_none()
    if student and course:
        await notify_enrollment_decision(
            db,
            student_id=student.id,
            student_email=student.email,
            student_name=student.full_name,
            course_title=course.title,
            approved=True,
            reason=payload.reason,
        )

    await db.commit()
    await db.refresh(req)
    return req


@router.post("/{request_id}/reject", response_model=EnrollmentRequestOut)
async def reject(
    request_id: UUID,
    payload: DecisionIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnrollmentRequest:
    res = await db.execute(select(EnrollmentRequest).where(EnrollmentRequest.id == request_id))
    req = res.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.status != EnrollmentRequestStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {req.status.value}",
        )

    await _ensure_can_decide(user, db, req)

    req.status = EnrollmentRequestStatus.rejected
    req.processed_by = user.id
    req.processed_at = datetime.now(UTC)
    req.decision_reason = payload.reason

    # Notifications
    from app.models.course import Course
    from app.models.group import Group as GroupM
    from app.models.user import User as UserModel
    from app.services.notifier import notify_enrollment_decision

    student_res = await db.execute(select(UserModel).where(UserModel.id == req.student_id))
    student = student_res.scalar_one_or_none()
    group_res2 = await db.execute(select(GroupM).where(GroupM.id == req.group_id))
    group2 = group_res2.scalar_one_or_none()
    course = None
    if group2:
        course_res = await db.execute(select(Course).where(Course.id == group2.course_id))
        course = course_res.scalar_one_or_none()
    if student and course:
        await notify_enrollment_decision(
            db,
            student_id=student.id,
            student_email=student.email,
            student_name=student.full_name,
            course_title=course.title,
            approved=False,
            reason=payload.reason,
        )

    await db.commit()
    await db.refresh(req)
    return req


@router.post("/{request_id}/cancel", response_model=EnrollmentRequestOut)
async def cancel(
    request_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnrollmentRequest:
    res = await db.execute(select(EnrollmentRequest).where(EnrollmentRequest.id == request_id))
    req = res.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    if req.student_id != user.id and not permissions.is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if req.status != EnrollmentRequestStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Request is already {req.status.value}",
        )

    req.status = EnrollmentRequestStatus.cancelled
    req.processed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(req)
    return req
