"""Endpoints around teacher staff management.

- /api/teachers/load — list of teachers with active group/student counts
- /api/teachers/me/students — student roster for the calling teacher
- /api/teachers/me/today — today's lessons of the calling teacher
"""
from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.assignment import Submission, SubmissionStatus
from app.models.course import Course
from app.models.group import Enrollment, Group, GroupStatus
from app.models.lesson import Attendance, AttendanceStatus, LessonInstance
from app.models.user import User, UserRole, UserRoleAssignment
from app.services import permissions

router = APIRouter()


class TeacherLoad(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    email: str | None
    active_groups: int
    total_students: int
    today_lessons: int


class StudentRosterRow(BaseModel):
    id: UUID
    full_name: str
    email: str | None
    group_id: UUID
    group_course_id: UUID
    course_title: str
    course_level: str
    enrolled_at: datetime
    attendance_rate: float
    homework_total: int
    homework_submitted: int
    homework_graded: int
    avg_score: float | None


class TeacherTodayLesson(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    scheduled_at: datetime
    duration_min: int
    group_id: UUID
    course_title: str
    enrolled_count: int


def _ensure_teacher_or_staff(user: User) -> None:
    if (
        permissions.is_admin(user)
        or permissions.is_methodist(user)
        or permissions.is_branch_manager(user)
        or permissions.is_teacher(user)
    ):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.get("/load", response_model=list[TeacherLoad])
async def teachers_load(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TeacherLoad]:
    if not (
        permissions.is_admin(user)
        or permissions.is_methodist(user)
        or permissions.is_branch_manager(user)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    teachers_res = await db.execute(
        select(User)
        .join(UserRoleAssignment, UserRoleAssignment.user_id == User.id)
        .where(
            UserRoleAssignment.role == UserRole.teacher,
            UserRoleAssignment.revoked_at.is_(None),
            User.deleted_at.is_(None),
        )
        .distinct()
        .order_by(User.full_name)
    )
    teachers = list(teachers_res.scalars().all())

    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    rows: list[TeacherLoad] = []
    for t in teachers:
        groups_count = (
            await db.execute(
                select(func.count())
                .select_from(Group)
                .where(
                    Group.teacher_id == t.id,
                    Group.deleted_at.is_(None),
                    Group.status.in_([GroupStatus.planned, GroupStatus.active]),
                )
            )
        ).scalar_one()

        students_count = (
            await db.execute(
                select(func.count(distinct(Enrollment.student_id)))
                .select_from(Enrollment)
                .join(Group, Group.id == Enrollment.group_id)
                .where(
                    Group.teacher_id == t.id,
                    Enrollment.left_at.is_(None),
                    Enrollment.deleted_at.is_(None),
                )
            )
        ).scalar_one()

        today_count = (
            await db.execute(
                select(func.count())
                .select_from(LessonInstance)
                .join(Group, Group.id == LessonInstance.group_id)
                .where(
                    Group.teacher_id == t.id,
                    LessonInstance.scheduled_at >= today,
                    LessonInstance.scheduled_at < tomorrow,
                )
            )
        ).scalar_one()

        rows.append(
            TeacherLoad(
                id=t.id,
                full_name=t.full_name,
                email=t.email,
                active_groups=int(groups_count),
                total_students=int(students_count),
                today_lessons=int(today_count),
            )
        )
    return rows


@router.get("/me/students", response_model=list[StudentRosterRow])
async def my_students(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[StudentRosterRow]:
    _ensure_teacher_or_staff(user)

    # Build the set of groups the caller "owns": teacher = own groups,
    # methodist/admin = all, branch_manager = own branches.
    if permissions.is_teacher(user) and not (
        permissions.is_admin(user) or permissions.is_methodist(user)
    ):
        groups_filter = (Group.teacher_id == user.id,)
    elif permissions.is_branch_manager(user) and not (
        permissions.is_admin(user) or permissions.is_methodist(user)
    ):
        # accept their branches via UserRoleAssignment.branch_id
        roles_res = await db.execute(
            select(UserRoleAssignment.branch_id).where(
                UserRoleAssignment.user_id == user.id,
                UserRoleAssignment.role == UserRole.branch_manager,
                UserRoleAssignment.revoked_at.is_(None),
            )
        )
        branch_ids = [r[0] for r in roles_res.all() if r[0] is not None]
        if not branch_ids:
            return []
        groups_filter = (Group.branch_id.in_(branch_ids),)
    else:
        groups_filter = ()  # admin / methodist see all

    enr_res = await db.execute(
        select(Enrollment, Group, Course, User)
        .join(Group, Group.id == Enrollment.group_id)
        .join(Course, Course.id == Group.course_id)
        .join(User, User.id == Enrollment.student_id)
        .where(
            Enrollment.left_at.is_(None),
            Enrollment.deleted_at.is_(None),
            Group.deleted_at.is_(None),
            *groups_filter,
        )
        .order_by(User.full_name)
    )
    rows = enr_res.all()

    out: list[StudentRosterRow] = []
    for e, g, c, u in rows:
        att_total = (
            await db.execute(
                select(func.count())
                .select_from(Attendance)
                .join(LessonInstance, LessonInstance.id == Attendance.lesson_instance_id)
                .where(LessonInstance.group_id == g.id, Attendance.student_id == u.id)
            )
        ).scalar_one()
        att_present = (
            await db.execute(
                select(func.count())
                .select_from(Attendance)
                .join(LessonInstance, LessonInstance.id == Attendance.lesson_instance_id)
                .where(
                    LessonInstance.group_id == g.id,
                    Attendance.student_id == u.id,
                    Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
                )
            )
        ).scalar_one()

        sub_total = (
            await db.execute(
                select(func.count())
                .select_from(Submission)
                .where(Submission.student_id == u.id)
            )
        ).scalar_one()
        sub_submitted = (
            await db.execute(
                select(func.count())
                .select_from(Submission)
                .where(
                    Submission.student_id == u.id,
                    Submission.status.in_([SubmissionStatus.submitted, SubmissionStatus.graded]),
                )
            )
        ).scalar_one()
        sub_graded = (
            await db.execute(
                select(func.count())
                .select_from(Submission)
                .where(
                    Submission.student_id == u.id,
                    Submission.status == SubmissionStatus.graded,
                )
            )
        ).scalar_one()
        avg = (
            await db.execute(
                select(func.avg(Submission.score)).where(
                    Submission.student_id == u.id,
                    Submission.status == SubmissionStatus.graded,
                )
            )
        ).scalar_one()

        out.append(
            StudentRosterRow(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                group_id=g.id,
                group_course_id=c.id,
                course_title=c.title,
                course_level=c.level.value,
                enrolled_at=e.enrolled_at,
                attendance_rate=(att_present / att_total) if att_total else 0.0,
                homework_total=int(sub_total),
                homework_submitted=int(sub_submitted),
                homework_graded=int(sub_graded),
                avg_score=float(avg) if avg is not None else None,
            )
        )
    return out


@router.get("/me/today", response_model=list[TeacherTodayLesson])
async def my_today_lessons(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TeacherTodayLesson]:
    if not permissions.is_teacher(user) and not (
        permissions.is_admin(user) or permissions.is_methodist(user)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    today = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)

    res = await db.execute(
        select(LessonInstance, Group, Course)
        .join(Group, Group.id == LessonInstance.group_id)
        .join(Course, Course.id == Group.course_id)
        .where(
            LessonInstance.scheduled_at >= today,
            LessonInstance.scheduled_at < tomorrow,
            Group.teacher_id == user.id if permissions.is_teacher(user) and not permissions.is_admin(user) else True,
        )
        .order_by(LessonInstance.scheduled_at)
    )
    rows = res.all()
    out: list[TeacherTodayLesson] = []
    for l, g, c in rows:
        cnt = (
            await db.execute(
                select(func.count())
                .select_from(Enrollment)
                .where(Enrollment.group_id == g.id, Enrollment.left_at.is_(None))
            )
        ).scalar_one()
        out.append(
            TeacherTodayLesson(
                id=l.id,
                title=l.title,
                scheduled_at=l.scheduled_at,
                duration_min=l.duration_min,
                group_id=g.id,
                course_title=c.title,
                enrolled_count=int(cnt),
            )
        )
    return out
