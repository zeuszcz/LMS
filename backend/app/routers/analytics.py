"""Aggregate analytics for admin/methodist."""
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser
from app.core.database import get_db
from app.models.assignment import Submission, SubmissionStatus
from app.models.billing import LessonCreditLedger, Payment, PaymentStatus
from app.models.branch import Branch
from app.models.course import Course
from app.models.enrollment_request import EnrollmentRequest, EnrollmentRequestStatus
from app.models.group import Enrollment, Group, GroupStatus
from app.models.lesson import Attendance, AttendanceStatus, LessonInstance
from app.models.user import User, UserRole, UserRoleAssignment
from app.services import permissions

router = APIRouter()


class AnalyticsOverview(BaseModel):
    total_branches: int
    total_courses: int
    total_active_groups: int
    total_students: int
    total_teachers: int
    total_lessons: int
    lessons_finished: int
    submissions_total: int
    submissions_graded: int
    pending_requests: int
    avg_attendance: float
    avg_score: float | None
    revenue_minor: int
    revenue_currency: str


class TimelinePoint(BaseModel):
    date: str
    lessons: int
    submissions: int
    payments: int
    revenue_minor: int


class CourseStat(BaseModel):
    course_id: str
    title: str
    level: str
    language: str
    active_groups: int
    students: int


class BranchStat(BaseModel):
    branch_id: str
    name: str
    city: str
    active_groups: int
    students: int


def _ensure_admin(user) -> None:
    if not (permissions.is_admin(user) or permissions.is_methodist(user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin / methodist only")


@router.get("/overview", response_model=AnalyticsOverview)
async def overview(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AnalyticsOverview:
    _ensure_admin(user)

    total_branches = (await db.execute(select(func.count()).select_from(Branch).where(Branch.deleted_at.is_(None)))).scalar_one()
    total_courses = (await db.execute(select(func.count()).select_from(Course).where(Course.deleted_at.is_(None)))).scalar_one()
    total_groups = (
        await db.execute(
            select(func.count())
            .select_from(Group)
            .where(Group.deleted_at.is_(None), Group.status.in_([GroupStatus.planned, GroupStatus.active]))
        )
    ).scalar_one()
    total_students = (
        await db.execute(
            select(func.count(distinct(Enrollment.student_id)))
            .select_from(Enrollment)
            .where(Enrollment.left_at.is_(None), Enrollment.deleted_at.is_(None))
        )
    ).scalar_one()
    total_teachers = (
        await db.execute(
            select(func.count(distinct(UserRoleAssignment.user_id)))
            .where(UserRoleAssignment.role == UserRole.teacher, UserRoleAssignment.revoked_at.is_(None))
        )
    ).scalar_one()
    total_lessons = (await db.execute(select(func.count()).select_from(LessonInstance))).scalar_one()
    lessons_finished = (
        await db.execute(
            select(func.count()).select_from(LessonInstance)
            .where(LessonInstance.status == 'finished')
        )
    ).scalar_one()
    sub_total = (await db.execute(select(func.count()).select_from(Submission))).scalar_one()
    sub_graded = (
        await db.execute(
            select(func.count()).select_from(Submission)
            .where(Submission.status == SubmissionStatus.graded)
        )
    ).scalar_one()
    pending_req = (
        await db.execute(
            select(func.count()).select_from(EnrollmentRequest)
            .where(EnrollmentRequest.status == EnrollmentRequestStatus.pending)
        )
    ).scalar_one()
    att_total = (await db.execute(select(func.count()).select_from(Attendance))).scalar_one()
    att_present = (
        await db.execute(
            select(func.count()).select_from(Attendance)
            .where(Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]))
        )
    ).scalar_one()
    avg_score = (
        await db.execute(
            select(func.avg(Submission.score))
            .where(Submission.status == SubmissionStatus.graded)
        )
    ).scalar_one()
    revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Payment.amount_minor), 0))
            .where(Payment.status == PaymentStatus.succeeded)
        )
    ).scalar_one()

    return AnalyticsOverview(
        total_branches=int(total_branches),
        total_courses=int(total_courses),
        total_active_groups=int(total_groups),
        total_students=int(total_students),
        total_teachers=int(total_teachers),
        total_lessons=int(total_lessons),
        lessons_finished=int(lessons_finished),
        submissions_total=int(sub_total),
        submissions_graded=int(sub_graded),
        pending_requests=int(pending_req),
        avg_attendance=(float(att_present) / float(att_total)) if att_total else 0.0,
        avg_score=float(avg_score) if avg_score is not None else None,
        revenue_minor=int(revenue),
        revenue_currency='RUB',
    )


@router.get("/timeline", response_model=list[TimelinePoint])
async def timeline(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    days: int = 30,
) -> list[TimelinePoint]:
    _ensure_admin(user)
    days = max(7, min(180, days))

    end = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    start = end - timedelta(days=days)

    points: list[TimelinePoint] = []
    cursor = start
    while cursor < end:
        next_day = cursor + timedelta(days=1)
        l = (
            await db.execute(
                select(func.count()).select_from(LessonInstance).where(
                    LessonInstance.scheduled_at >= cursor,
                    LessonInstance.scheduled_at < next_day,
                )
            )
        ).scalar_one()
        s = (
            await db.execute(
                select(func.count()).select_from(Submission).where(
                    Submission.created_at >= cursor,
                    Submission.created_at < next_day,
                )
            )
        ).scalar_one()
        p = (
            await db.execute(
                select(func.count()).select_from(Payment).where(
                    Payment.created_at >= cursor,
                    Payment.created_at < next_day,
                    Payment.status == PaymentStatus.succeeded,
                )
            )
        ).scalar_one()
        rev = (
            await db.execute(
                select(func.coalesce(func.sum(Payment.amount_minor), 0)).where(
                    Payment.created_at >= cursor,
                    Payment.created_at < next_day,
                    Payment.status == PaymentStatus.succeeded,
                )
            )
        ).scalar_one()
        points.append(
            TimelinePoint(
                date=cursor.date().isoformat(),
                lessons=int(l),
                submissions=int(s),
                payments=int(p),
                revenue_minor=int(rev),
            )
        )
        cursor = next_day
    return points


@router.get("/by-course", response_model=list[CourseStat])
async def by_course(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CourseStat]:
    _ensure_admin(user)
    res = await db.execute(
        select(
            Course.id,
            Course.title,
            Course.level,
            Course.language,
            func.count(distinct(Group.id)).label('groups'),
            func.count(distinct(Enrollment.student_id)).label('students'),
        )
        .select_from(Course)
        .outerjoin(Group, (Group.course_id == Course.id) & (Group.deleted_at.is_(None)) & (Group.status.in_([GroupStatus.planned, GroupStatus.active])))
        .outerjoin(Enrollment, (Enrollment.group_id == Group.id) & (Enrollment.left_at.is_(None)))
        .where(Course.deleted_at.is_(None))
        .group_by(Course.id, Course.title, Course.level, Course.language)
        .order_by(func.count(distinct(Enrollment.student_id)).desc())
    )
    return [
        CourseStat(
            course_id=str(c_id),
            title=title,
            level=level.value if hasattr(level, 'value') else str(level),
            language=lang.value if hasattr(lang, 'value') else str(lang),
            active_groups=int(g),
            students=int(s),
        )
        for c_id, title, level, lang, g, s in res.all()
    ]


@router.get("/by-branch", response_model=list[BranchStat])
async def by_branch(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[BranchStat]:
    _ensure_admin(user)
    res = await db.execute(
        select(
            Branch.id,
            Branch.name,
            Branch.city,
            func.count(distinct(Group.id)).label('groups'),
            func.count(distinct(Enrollment.student_id)).label('students'),
        )
        .select_from(Branch)
        .outerjoin(Group, (Group.branch_id == Branch.id) & (Group.deleted_at.is_(None)) & (Group.status.in_([GroupStatus.planned, GroupStatus.active])))
        .outerjoin(Enrollment, (Enrollment.group_id == Group.id) & (Enrollment.left_at.is_(None)))
        .where(Branch.deleted_at.is_(None))
        .group_by(Branch.id, Branch.name, Branch.city)
        .order_by(Branch.name)
    )
    return [
        BranchStat(
            branch_id=str(b_id),
            name=name,
            city=city,
            active_groups=int(g),
            students=int(s),
        )
        for b_id, name, city, g, s in res.all()
    ]
