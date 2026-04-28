from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel, Field

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.group import Enrollment, Group, GroupStatus
from app.models.schedule import ScheduleSlot
from app.models.user import User, UserRole
from app.schemas.group import (
    EnrollmentIn,
    EnrollmentOut,
    GroupCreate,
    GroupDetail,
    GroupOut,
)
from app.services import permissions

router = APIRouter()


@router.get("/", response_model=list[GroupOut])
async def list_groups(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    branch_id: UUID | None = None,
    teacher_id: UUID | None = None,
    course_id: UUID | None = None,
) -> list[Group]:
    stmt = select(Group).where(Group.deleted_at.is_(None))
    if branch_id is not None:
        stmt = stmt.where(Group.branch_id == branch_id)
    if teacher_id is not None:
        stmt = stmt.where(Group.teacher_id == teacher_id)
    if course_id is not None:
        stmt = stmt.where(Group.course_id == course_id)

    # Students only see groups they're enrolled in.
    if permissions.is_student(user) and not (
        permissions.is_admin(user) or permissions.is_methodist(user) or permissions.is_teacher(user)
    ):
        student_groups = (
            select(Enrollment.group_id)
            .where(Enrollment.student_id == user.id, Enrollment.left_at.is_(None))
        ).subquery()
        stmt = stmt.where(Group.id.in_(select(student_groups)))

    # Teachers see their own groups.
    if permissions.is_teacher(user) and not (
        permissions.is_admin(user) or permissions.is_methodist(user)
    ):
        stmt = stmt.where(Group.teacher_id == user.id)

    stmt = stmt.order_by(Group.start_date.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: GroupCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Group:
    if not permissions.can_manage_group(user, payload.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage groups in this branch")

    group = Group(
        course_id=payload.course_id,
        branch_id=payload.branch_id,
        teacher_id=payload.teacher_id,
        mode=payload.mode,
        start_date=payload.start_date,
        end_date=payload.end_date,
        max_students=payload.max_students,
    )
    db.add(group)
    await db.flush()

    for s in payload.slots:
        db.add(
            ScheduleSlot(
                group_id=group.id,
                weekday=s.weekday,
                start_time=s.start_time,
                end_time=s.end_time,
                valid_from=s.valid_from,
                valid_to=s.valid_to,
            )
        )

    await db.commit()
    await db.refresh(group)
    return group


@router.get("/{group_id}", response_model=GroupDetail)
async def get_group(
    group_id: UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GroupDetail:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    slots = await db.execute(select(ScheduleSlot).where(ScheduleSlot.group_id == group_id))
    return GroupDetail(
        **GroupOut.model_validate(group).model_dump(),
        slots=[s for s in slots.scalars().all()],
    )


class GroupPatch(BaseModel):
    teacher_id: UUID | None = None
    branch_id: UUID | None = None
    max_students: int | None = Field(default=None, ge=1, le=30)
    status: GroupStatus | None = None


@router.patch("/{group_id}", response_model=GroupDetail)
async def update_group(
    group_id: UUID,
    payload: GroupPatch,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GroupDetail:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if not permissions.can_manage_group(user, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage this group")

    fields = payload.model_dump(exclude_unset=True)
    for k, v in fields.items():
        setattr(group, k, v)
    await db.commit()
    await db.refresh(group)

    slots = await db.execute(select(ScheduleSlot).where(ScheduleSlot.group_id == group_id))
    return GroupDetail(
        **GroupOut.model_validate(group).model_dump(),
        slots=[s for s in slots.scalars().all()],
    )


@router.delete(
    "/{group_id}/enrollments/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unenroll(
    group_id: UUID,
    student_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    group_res = await db.execute(select(Group).where(Group.id == group_id))
    group = group_res.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if not permissions.can_manage_group(user, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    enrolled = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.group_id == group_id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    enrollment = enrolled.scalar_one_or_none()
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    enrollment.left_at = datetime.now(UTC)
    await db.commit()


@router.post(
    "/{group_id}/enrollments",
    response_model=EnrollmentOut,
    status_code=status.HTTP_201_CREATED,
)
async def enroll(
    group_id: UUID,
    payload: EnrollmentIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Enrollment:
    group_res = await db.execute(select(Group).where(Group.id == group_id))
    group = group_res.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if not permissions.can_manage_group(user, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    student_res = await db.execute(select(User).where(User.id == payload.student_id))
    student = student_res.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if not any(r.role == UserRole.student for r in student.roles if r.revoked_at is None):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a student")

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == payload.student_id,
            Enrollment.group_id == group_id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled")

    count = (
        await db.execute(
            select(func.count())
            .select_from(Enrollment)
            .where(Enrollment.group_id == group_id, Enrollment.left_at.is_(None))
        )
    ).scalar_one()
    if count >= group.max_students:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Group is full")

    enrollment = Enrollment(
        student_id=payload.student_id,
        group_id=group_id,
        enrolled_at=datetime.now(UTC),
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


@router.get("/{group_id}/enrollments", response_model=list[EnrollmentOut])
async def list_enrollments(
    group_id: UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Enrollment]:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.group_id == group_id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    return list(result.scalars().all())
