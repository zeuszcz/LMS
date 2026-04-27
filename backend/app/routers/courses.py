from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, require_roles
from app.core.database import get_db
from app.models.course import AgeGroup, CefrLevel, Course, Language
from app.models.user import User, UserRole
from app.schemas.course import CourseCreate, CourseList, CourseOut

router = APIRouter()


@router.get("/", response_model=CourseList)
async def list_courses(
    _user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    language: Language | None = None,
    level: CefrLevel | None = None,
    age_group: AgeGroup | None = None,
    only_published: bool = True,
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
