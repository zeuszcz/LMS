"""Test factories — small helpers to build domain objects without boilerplate."""
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.branch import Branch
from app.models.course import AgeGroup, CefrLevel, Course, Language
from app.models.group import Enrollment, Group, GroupMode, GroupStatus
from app.models.lesson import LessonInstance, LessonStatus
from app.models.user import User, UserRole, UserRoleAssignment


async def make_user(
    db: AsyncSession,
    *,
    email: str | None = None,
    full_name: str = "Test User",
    role: UserRole = UserRole.student,
    branch_id: UUID | None = None,
    is_superuser: bool = False,
    password: str = "Test1234!",
) -> User:
    suffix = email or f"user-{datetime.now(UTC).timestamp()}@test.example.com"
    user = User(
        email=suffix,
        full_name=full_name,
        password_hash=hash_password(password),
        is_superuser=is_superuser,
    )
    db.add(user)
    await db.flush()
    db.add(UserRoleAssignment(user_id=user.id, role=role, branch_id=branch_id))
    await db.commit()
    await db.refresh(user)
    return user


async def make_branch(db: AsyncSession, name: str = "Test Branch") -> Branch:
    branch = Branch(name=name, address="Addr", city="Москва")
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch


async def make_course(db: AsyncSession, *, level: CefrLevel = CefrLevel.B1) -> Course:
    course = Course(
        title=f"Course {level.value}",
        language=Language.en,
        level=level,
        age_group=AgeGroup.adults,
        duration_weeks=16,
        lessons_count=32,
        published_at=datetime.now(UTC),
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


async def make_group(
    db: AsyncSession,
    *,
    course: Course,
    branch: Branch | None = None,
    teacher: User | None = None,
) -> Group:
    group = Group(
        course_id=course.id,
        branch_id=branch.id if branch else None,
        teacher_id=teacher.id if teacher else None,
        mode=GroupMode.offline,
        start_date=date.today(),
        max_students=12,
        status=GroupStatus.active,
    )
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


async def enroll(db: AsyncSession, group: Group, student: User) -> Enrollment:
    enrollment = Enrollment(
        student_id=student.id,
        group_id=group.id,
        enrolled_at=datetime.now(UTC),
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment


async def make_lesson(
    db: AsyncSession,
    group: Group,
    *,
    sequence: int = 1,
    in_past: bool = False,
) -> LessonInstance:
    when = datetime.now(UTC) + timedelta(days=-1 if in_past else 1)
    lesson = LessonInstance(
        group_id=group.id,
        sequence=sequence,
        title=f"Lesson {sequence}",
        scheduled_at=when,
        duration_min=60,
        status=LessonStatus.planned,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


async def login_token(client, email: str, password: str = "Test1234!") -> str:
    response = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    return response.json()["access_token"]
