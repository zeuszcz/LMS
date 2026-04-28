from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.group import Enrollment, Group
from app.models.lesson import Attendance, AttendanceStatus, LessonInstance, LessonStatus
from app.schemas.lesson import (
    AttendanceBulkIn,
    AttendanceOut,
    LessonClose,
    LessonCreate,
    LessonOut,
)
from app.services import permissions

router = APIRouter()


async def _get_group_or_404(db: AsyncSession, group_id: UUID) -> Group:
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return group


async def _get_lesson_or_404(db: AsyncSession, lesson_id: UUID) -> LessonInstance:
    result = await db.execute(select(LessonInstance).where(LessonInstance.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


@router.get("/", response_model=list[LessonOut])
async def list_lessons(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    group_id: UUID | None = None,
    upcoming_only: bool = False,
) -> list[LessonInstance]:
    stmt = select(LessonInstance)
    if group_id is not None:
        stmt = stmt.where(LessonInstance.group_id == group_id)
    if upcoming_only:
        stmt = stmt.where(LessonInstance.scheduled_at >= datetime.now(UTC))

    # Students see only lessons of groups they're enrolled in.
    if permissions.is_student(user) and not (
        permissions.is_admin(user) or permissions.is_methodist(user) or permissions.is_teacher(user)
    ):
        student_groups = (
            select(Enrollment.group_id)
            .where(Enrollment.student_id == user.id, Enrollment.left_at.is_(None))
        ).subquery()
        stmt = stmt.where(LessonInstance.group_id.in_(select(student_groups)))

    stmt = stmt.order_by(LessonInstance.scheduled_at).limit(200)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    payload: LessonCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonInstance:
    group = await _get_group_or_404(db, payload.group_id)
    if not permissions.can_manage_group(user, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    lesson = LessonInstance(
        group_id=payload.group_id,
        sequence=payload.sequence,
        title=payload.title,
        scheduled_at=payload.scheduled_at,
        duration_min=payload.duration_min,
        status=LessonStatus.planned,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}", response_model=LessonOut)
async def get_lesson(
    lesson_id: UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonInstance:
    return await _get_lesson_or_404(db, lesson_id)


class LessonPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    scheduled_at: datetime | None = None
    duration_min: int | None = Field(default=None, ge=15, le=240)
    status: LessonStatus | None = None
    summary: str | None = Field(default=None, max_length=500)
    content_md: str | None = Field(default=None, max_length=20000)
    notes_for_methodist: str | None = Field(default=None, max_length=4000)


@router.patch("/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    lesson_id: UUID,
    payload: LessonPatch,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonInstance:
    lesson = await _get_lesson_or_404(db, lesson_id)
    group = await _get_group_or_404(db, lesson.group_id)
    if not permissions.can_record_attendance(user, group.teacher_id, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    fields = payload.model_dump(exclude_unset=True)
    for k, v in fields.items():
        setattr(lesson, k, v)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/cancel", response_model=LessonOut)
async def cancel_lesson(
    lesson_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonInstance:
    lesson = await _get_lesson_or_404(db, lesson_id)
    group = await _get_group_or_404(db, lesson.group_id)
    if not permissions.can_record_attendance(user, group.teacher_id, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if lesson.status == LessonStatus.finished:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Already finished"
        )
    lesson.status = LessonStatus.cancelled
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/start", response_model=LessonOut)
async def start_lesson(
    lesson_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonInstance:
    lesson = await _get_lesson_or_404(db, lesson_id)
    group = await _get_group_or_404(db, lesson.group_id)
    if not permissions.can_record_attendance(user, group.teacher_id, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if lesson.status not in (LessonStatus.planned, LessonStatus.in_progress):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Cannot start lesson in status {lesson.status}")

    if lesson.actual_started_at is None:
        lesson.actual_started_at = datetime.now(UTC)
    lesson.status = LessonStatus.in_progress
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/attendance", response_model=list[AttendanceOut])
async def record_attendance(
    lesson_id: UUID,
    payload: AttendanceBulkIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Attendance]:
    lesson = await _get_lesson_or_404(db, lesson_id)
    group = await _get_group_or_404(db, lesson.group_id)
    if not permissions.can_record_attendance(user, group.teacher_id, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    enrollments = await db.execute(
        select(Enrollment.student_id).where(
            Enrollment.group_id == group.id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    enrolled_ids = {row[0] for row in enrollments.all()}

    saved: list[Attendance] = []
    for entry in payload.entries:
        if entry.student_id not in enrolled_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student {entry.student_id} is not enrolled in this group",
            )
        existing = await db.execute(
            select(Attendance).where(
                Attendance.lesson_instance_id == lesson_id,
                Attendance.student_id == entry.student_id,
            )
        )
        att = existing.scalar_one_or_none()
        if att is None:
            att = Attendance(
                lesson_instance_id=lesson_id,
                student_id=entry.student_id,
                status=entry.status,
                participation_score=entry.participation_score,
                comment=entry.comment,
                recorded_by=user.id,
            )
            db.add(att)
        else:
            att.status = entry.status
            att.participation_score = entry.participation_score
            att.comment = entry.comment
            att.recorded_by = user.id
        saved.append(att)

    await db.commit()
    for att in saved:
        await db.refresh(att)
    return saved


@router.post("/{lesson_id}/close", response_model=LessonOut)
async def close_lesson(
    lesson_id: UUID,
    payload: LessonClose,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonInstance:
    lesson = await _get_lesson_or_404(db, lesson_id)
    group = await _get_group_or_404(db, lesson.group_id)
    if not permissions.can_record_attendance(user, group.teacher_id, group.branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if lesson.status == LessonStatus.finished:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Lesson already closed")

    enrollments = await db.execute(
        select(Enrollment.student_id).where(
            Enrollment.group_id == group.id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    enrolled_ids = {row[0] for row in enrollments.all()}
    payload_ids = {a.student_id for a in payload.attendance}
    missing = enrolled_ids - payload_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance missing for {len(missing)} student(s); cannot close",
        )

    for entry in payload.attendance:
        if entry.student_id not in enrolled_ids:
            continue
        existing = await db.execute(
            select(Attendance).where(
                Attendance.lesson_instance_id == lesson_id,
                Attendance.student_id == entry.student_id,
            )
        )
        att = existing.scalar_one_or_none()
        if att is None:
            db.add(
                Attendance(
                    lesson_instance_id=lesson_id,
                    student_id=entry.student_id,
                    status=entry.status,
                    participation_score=entry.participation_score,
                    comment=entry.comment,
                    recorded_by=user.id,
                )
            )
        else:
            att.status = entry.status
            att.participation_score = entry.participation_score
            att.comment = entry.comment
            att.recorded_by = user.id

    if lesson.actual_started_at is None:
        lesson.actual_started_at = lesson.scheduled_at
    lesson.actual_ended_at = datetime.now(UTC)
    lesson.status = LessonStatus.finished
    if payload.notes_for_methodist is not None:
        lesson.notes_for_methodist = payload.notes_for_methodist
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}/attendance", response_model=list[AttendanceOut])
async def get_attendance(
    lesson_id: UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Attendance]:
    result = await db.execute(
        select(Attendance).where(Attendance.lesson_instance_id == lesson_id)
    )
    return list(result.scalars().all())


@router.post("/{lesson_id}/self-complete", response_model=AttendanceOut)
async def self_complete(
    lesson_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Attendance:
    """Student marks the lesson's material as studied. Creates / updates own
    attendance row with status=present and recorded_by=self."""
    lesson = await _get_lesson_or_404(db, lesson_id)

    enrolled = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == user.id,
            Enrollment.group_id == lesson.group_id,
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
        )
    )
    if enrolled.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Сначала запишитесь в группу этого курса",
        )

    existing = await db.execute(
        select(Attendance).where(
            Attendance.lesson_instance_id == lesson_id,
            Attendance.student_id == user.id,
        )
    )
    att = existing.scalar_one_or_none()
    if att is None:
        att = Attendance(
            lesson_instance_id=lesson_id,
            student_id=user.id,
            status=AttendanceStatus.present,
            recorded_by=user.id,
            comment="self-completed",
        )
        db.add(att)
    elif att.status not in (AttendanceStatus.present, AttendanceStatus.late):
        att.status = AttendanceStatus.present
        att.recorded_by = user.id
        if not att.comment:
            att.comment = "self-completed"

    await db.commit()
    await db.refresh(att)
    return att
