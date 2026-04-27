from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.assignment import Assignment, Submission, SubmissionStatus
from app.models.group import Enrollment, Group
from app.models.lesson import LessonInstance
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentOut,
    GradeIn,
    SubmissionIn,
    SubmissionOut,
)
from app.services import permissions

router = APIRouter()


@router.post("/", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    payload: AssignmentCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Assignment:
    lesson_res = await db.execute(
        select(LessonInstance).where(LessonInstance.id == payload.lesson_instance_id)
    )
    lesson = lesson_res.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    group_res = await db.execute(select(Group).where(Group.id == lesson.group_id))
    group = group_res.scalar_one_or_none()
    if not permissions.can_grade(user, group.teacher_id if group else None, group.branch_id if group else None):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    assignment = Assignment(
        lesson_instance_id=payload.lesson_instance_id,
        title=payload.title,
        kind=payload.kind,
        instructions=payload.instructions,
        payload=payload.payload,
        due_at=payload.due_at,
        max_score=payload.max_score,
        auto_check=payload.auto_check,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


@router.get("/", response_model=list[AssignmentOut])
async def list_assignments(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    lesson_instance_id: UUID | None = None,
    group_id: UUID | None = None,
    student_only: bool = False,
) -> list[Assignment]:
    stmt = select(Assignment).where(Assignment.deleted_at.is_(None))
    if lesson_instance_id is not None:
        stmt = stmt.where(Assignment.lesson_instance_id == lesson_instance_id)
    if group_id is not None:
        stmt = stmt.join(LessonInstance).where(LessonInstance.group_id == group_id)
    if student_only or (
        permissions.is_student(user) and not (permissions.is_admin(user) or permissions.is_teacher(user))
    ):
        sub = (
            select(LessonInstance.id)
            .join(Enrollment, Enrollment.group_id == LessonInstance.group_id)
            .where(Enrollment.student_id == user.id, Enrollment.left_at.is_(None))
        ).subquery()
        stmt = stmt.where(Assignment.lesson_instance_id.in_(select(sub)))

    stmt = stmt.order_by(Assignment.created_at.desc()).limit(200)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "/{assignment_id}/submissions",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit(
    assignment_id: UUID,
    payload: SubmissionIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Submission:
    if not permissions.is_student(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only students can submit")

    res = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = res.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    existing_res = await db.execute(
        select(Submission)
        .where(Submission.assignment_id == assignment_id, Submission.student_id == user.id)
        .order_by(Submission.attempt_no.desc())
    )
    last = existing_res.scalars().first()

    if last is not None and last.status == SubmissionStatus.draft:
        last.payload = payload.payload
        if payload.submit:
            last.submitted_at = datetime.now(UTC)
            last.status = SubmissionStatus.submitted
        await db.commit()
        await db.refresh(last)
        return last

    submission = Submission(
        assignment_id=assignment_id,
        student_id=user.id,
        attempt_no=(last.attempt_no + 1) if last else 1,
        payload=payload.payload,
        status=SubmissionStatus.submitted if payload.submit else SubmissionStatus.draft,
        submitted_at=datetime.now(UTC) if payload.submit else None,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


@router.get("/{assignment_id}/submissions", response_model=list[SubmissionOut])
async def list_submissions(
    assignment_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Submission]:
    stmt = select(Submission).where(Submission.assignment_id == assignment_id)
    if permissions.is_student(user) and not (permissions.is_admin(user) or permissions.is_teacher(user)):
        stmt = stmt.where(Submission.student_id == user.id)
    result = await db.execute(stmt.order_by(Submission.created_at.desc()))
    return list(result.scalars().all())


@router.post("/submissions/{submission_id}/grade", response_model=SubmissionOut)
async def grade(
    submission_id: UUID,
    payload: GradeIn,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Submission:
    res = await db.execute(select(Submission).where(Submission.id == submission_id))
    submission = res.scalar_one_or_none()
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    assignment_res = await db.execute(
        select(Assignment).where(Assignment.id == submission.assignment_id)
    )
    assignment = assignment_res.scalar_one_or_none()
    lesson_res = await db.execute(
        select(LessonInstance).where(LessonInstance.id == assignment.lesson_instance_id)
    )
    lesson = lesson_res.scalar_one_or_none()
    group_res = await db.execute(select(Group).where(Group.id == lesson.group_id))
    group = group_res.scalar_one_or_none()
    if not permissions.can_grade(
        user, group.teacher_id if group else None, group.branch_id if group else None
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if payload.score > assignment.max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Score {payload.score} exceeds max {assignment.max_score}",
        )

    submission.score = payload.score
    submission.feedback = payload.feedback
    submission.rubric = payload.rubric
    submission.graded_by = user.id
    submission.graded_at = datetime.now(UTC)
    submission.status = SubmissionStatus.graded

    await db.commit()
    await db.refresh(submission)
    return submission
