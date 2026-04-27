from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, require_roles
from app.core.database import get_db
from app.models.course import AgeGroup, CefrLevel, Course, Language
from app.models.course_content import CourseFeature, CourseModule, CourseReview
from app.models.group import Enrollment, Group, GroupStatus
from app.schemas.course import CourseCreate, CourseList, CourseOut
from app.schemas.course_detail import (
    CourseDetail,
    FeatureOut,
    GroupForCourse,
    ModuleOut,
    ReviewOut,
)
from app.models.user import User, UserRole

router = APIRouter()


@router.get("/", response_model=CourseList)
async def list_courses(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    language: Language | None = None,
    level: CefrLevel | None = None,
    age_group: AgeGroup | None = None,
    only_published: bool = True,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> CourseList:
    stmt = select(Course).where(Course.deleted_at.is_(None))
    if language:
        stmt = stmt.where(Course.language == language)
    if level:
        stmt = stmt.where(Course.level == level)
    if age_group:
        stmt = stmt.where(Course.age_group == age_group)
    if only_published:
        stmt = stmt.where(Course.published_at.is_not(None))
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(Course.title.ilike(like) | Course.description.ilike(like))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = stmt.order_by(Course.created_at.desc()).limit(min(limit, 200)).offset(offset)
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return CourseList(items=[CourseOut.model_validate(c) for c in items], total=total)


@router.post("/", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    _user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.methodist))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Course:
    course = Course(
        title=payload.title,
        language=payload.language,
        level=payload.level,
        age_group=payload.age_group,
        duration_weeks=payload.duration_weeks,
        lessons_count=payload.lessons_count,
        description=payload.description,
        methodology=payload.methodology,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseDetail)
async def course_detail(
    course_id: UUID,
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseDetail:
    res = await db.execute(select(Course).where(Course.id == course_id))
    course = res.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    modules_res = await db.execute(
        select(CourseModule)
        .where(CourseModule.course_id == course_id, CourseModule.deleted_at.is_(None))
        .order_by(CourseModule.order_index)
    )
    modules = list(modules_res.scalars().all())

    features_res = await db.execute(
        select(CourseFeature)
        .where(CourseFeature.course_id == course_id)
        .order_by(CourseFeature.order_index)
    )
    features = list(features_res.scalars().all())

    reviews_res = await db.execute(
        select(CourseReview)
        .where(CourseReview.course_id == course_id, CourseReview.is_published.is_(True))
        .order_by(CourseReview.created_at.desc())
        .limit(20)
    )
    reviews = list(reviews_res.scalars().all())

    avg = (
        await db.execute(
            select(func.avg(CourseReview.rating))
            .where(CourseReview.course_id == course_id, CourseReview.is_published.is_(True))
        )
    ).scalar_one()
    rcount = (
        await db.execute(
            select(func.count())
            .select_from(CourseReview)
            .where(CourseReview.course_id == course_id, CourseReview.is_published.is_(True))
        )
    ).scalar_one()

    groups_res = await db.execute(
        select(Group)
        .where(
            Group.course_id == course_id,
            Group.deleted_at.is_(None),
            Group.status.in_([GroupStatus.planned, GroupStatus.active]),
        )
        .order_by(Group.start_date.desc())
        .limit(20)
    )
    groups = list(groups_res.scalars().all())
    available_groups: list[GroupForCourse] = []
    for g in groups:
        enrolled = (
            await db.execute(
                select(func.count())
                .select_from(Enrollment)
                .where(Enrollment.group_id == g.id, Enrollment.left_at.is_(None))
            )
        ).scalar_one()
        available_groups.append(
            GroupForCourse(
                id=g.id,
                branch_id=g.branch_id,
                teacher_id=g.teacher_id,
                mode=g.mode.value,
                start_date=g.start_date.isoformat(),
                max_students=g.max_students,
                enrolled_count=int(enrolled),
            )
        )

    return CourseDetail(
        id=course.id,
        title=course.title,
        language=course.language,
        level=course.level,
        age_group=course.age_group,
        duration_weeks=course.duration_weeks,
        lessons_count=course.lessons_count,
        description=course.description,
        methodology=course.methodology,
        published_at=course.published_at,
        created_at=course.created_at,
        modules=[ModuleOut.model_validate(m) for m in modules],
        features=[FeatureOut.model_validate(f) for f in features],
        reviews=[ReviewOut.model_validate(r) for r in reviews],
        avg_rating=float(avg) if avg is not None else None,
        reviews_count=int(rcount),
        available_groups=available_groups,
    )


@router.post("/{course_id}/publish", response_model=CourseOut)
async def publish_course(
    course_id: UUID,
    _user: Annotated[User, Depends(require_roles(UserRole.admin, UserRole.methodist))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Course:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.published_at is None:
        course.published_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(course)
    return course
