"""Realistic demo dataset seeder.

Run after migrations + bootstrap:
    uv run python -m app.services.seed

Idempotent: detects existing demo data by `seed:demo` marker email and skips.
"""
from __future__ import annotations

import asyncio
import random
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.assignment import Assignment, AssignmentKind, Submission, SubmissionStatus
from app.models.billing import (
    LedgerReason,
    LessonCreditLedger,
    Payment,
    PaymentStatus,
    PricingPlan,
    PricingPlanKind,
    Subscription,
    SubscriptionStatus,
)
from app.models.branch import Branch
from app.models.course import AgeGroup, CefrLevel, Course, Language
from app.models.group import Enrollment, Group, GroupMode, GroupStatus
from app.models.lesson import Attendance, AttendanceStatus, LessonInstance, LessonStatus
from app.models.notification import (
    NotificationChannel,
    NotificationOutbox,
    NotificationStatus,
)
from app.models.schedule import ScheduleSlot
from app.models.user import (
    ParentLink,
    StudentProfile,
    TeacherProfile,
    User,
    UserRole,
    UserRoleAssignment,
)

logger = structlog.get_logger(__name__)
DEMO_PASSWORD = "password123"  # noqa: S105
DEMO_DOMAIN = "demo.yescenter.ru"
SEED_MARKER_EMAIL = f"seeded@{DEMO_DOMAIN}"


def _email(prefix: str) -> str:
    return f"{prefix}@{DEMO_DOMAIN}"


async def _create_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: UserRole,
    branch_id: UUID | None = None,
    *,
    is_superuser: bool = False,
) -> User:
    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(DEMO_PASSWORD),
        is_superuser=is_superuser,
        locale="ru",
        timezone="Europe/Moscow",
    )
    db.add(user)
    await db.flush()
    db.add(UserRoleAssignment(user_id=user.id, role=role, branch_id=branch_id))
    return user


async def already_seeded(db: AsyncSession) -> bool:
    result = await db.execute(select(User).where(User.email == SEED_MARKER_EMAIL))
    return result.scalar_one_or_none() is not None


async def seed(db: AsyncSession) -> None:
    if await already_seeded(db):
        logger.info("seed_already_done", marker=SEED_MARKER_EMAIL)
        return

    random.seed(42)

    # ── Branches ───────────────────────────────────────────────────────────
    b_mitino = Branch(
        name="YES Митино",
        address="Москва, ул. Митинская, 35",
        city="Москва",
        phone="+7 495 111-22-33",
    )
    b_kutuzov = Branch(
        name="YES Кутузовская",
        address="Москва, Кутузовский пр-т, 24",
        city="Москва",
        phone="+7 495 222-33-44",
    )
    b_vladimir = Branch(
        name="YES Владимир",
        address="Владимир, ул. Большая Московская, 19",
        city="Владимир",
        phone="+7 4922 33-44-55",
    )
    db.add_all([b_mitino, b_kutuzov, b_vladimir])
    await db.flush()
    branches = [b_mitino, b_kutuzov, b_vladimir]

    # ── Marker user (lets us detect prior seeding) ─────────────────────────
    marker = User(
        email=SEED_MARKER_EMAIL,
        full_name="Seed Marker",
        password_hash=hash_password(DEMO_PASSWORD),
        disabled_at=datetime.now(UTC),
    )
    db.add(marker)
    await db.flush()

    # ── Methodists & branch managers ───────────────────────────────────────
    for i, branch in enumerate(branches):
        await _create_user(
            db,
            _email(f"methodist{i + 1}"),
            f"Методист {branch.name}",
            UserRole.methodist,
            branch.id,
        )
        await _create_user(
            db,
            _email(f"manager{i + 1}"),
            f"Управляющий {branch.name}",
            UserRole.branch_manager,
            branch.id,
        )

    # ── Teachers ───────────────────────────────────────────────────────────
    teacher_names = [
        ("teacher_maria", "Мария Иванова"),
        ("teacher_elena", "Елена Соколова"),
        ("teacher_andrey", "Андрей Петров"),
        ("teacher_olga", "Ольга Новикова"),
        ("teacher_sergey", "Сергей Морозов"),
    ]
    teachers: list[User] = []
    for prefix, name in teacher_names:
        t = await _create_user(db, _email(prefix), name, UserRole.teacher)
        db.add(
            TeacherProfile(
                user_id=t.id,
                bio=f"{name} — преподаватель с международным сертификатом.",
                cambridge_cert="CELTA",
                hourly_rate_minor=2500_00,
            )
        )
        teachers.append(t)

    # ── Courses ────────────────────────────────────────────────────────────
    course_specs = [
        ("Английский для взрослых · B1", Language.en, CefrLevel.B1, AgeGroup.adults, 16, 32),
        ("Английский для взрослых · A2", Language.en, CefrLevel.A2, AgeGroup.adults, 16, 32),
        ("Английский для подростков · B1", Language.en, CefrLevel.B1, AgeGroup.teens, 16, 32),
        ("Английский для детей · A1", Language.en, CefrLevel.A1, AgeGroup.kids, 16, 32),
        ("Немецкий · A2", Language.de, CefrLevel.A2, AgeGroup.adults, 16, 32),
        ("Французский · A1", Language.fr, CefrLevel.A1, AgeGroup.adults, 16, 32),
        ("Испанский · A1", Language.es, CefrLevel.A1, AgeGroup.adults, 16, 32),
        ("Китайский · A1", Language.zh, CefrLevel.A1, AgeGroup.teens, 16, 32),
    ]
    courses: list[Course] = []
    for title, lang, level, age, weeks, lessons_count in course_specs:
        c = Course(
            title=title,
            language=lang,
            level=level,
            age_group=age,
            duration_weeks=weeks,
            lessons_count=lessons_count,
            description=f"Курс «{title}» по методике FLæʃcom. Коммуникативный подход, "
            f"акцент на разговорной практике.",
            methodology="FLæʃcom",
            published_at=datetime.now(UTC) - timedelta(days=30),
        )
        courses.append(c)
    db.add_all(courses)
    await db.flush()

    # ── Students (split by age group) ──────────────────────────────────────
    kid_first = ["Костя", "Аня", "Маша", "Петя", "Ваня", "Соня", "Лера", "Тимур", "Кира", "Дима"]
    teen_first = ["Никита", "Полина", "Даша", "Артём", "Юля", "Глеб", "Влада", "Илья"]
    adult_first = ["Алексей", "Мария", "Дмитрий", "Анна", "Сергей", "Татьяна", "Игорь", "Ольга", "Михаил", "Екатерина"]
    surnames = ["Иванов", "Петров", "Сидоров", "Кузнецов", "Соколов", "Михайлов", "Новиков", "Морозов", "Волков", "Зайцев"]

    students_kids: list[User] = []
    students_teens: list[User] = []
    students_adults: list[User] = []

    for i, name in enumerate(kid_first):
        s = await _create_user(db, _email(f"kid{i + 1}"), f"{name} {random.choice(surnames)}", UserRole.student)
        db.add(
            StudentProfile(
                user_id=s.id,
                birthdate=date(2017 - random.randint(0, 4), random.randint(1, 12), random.randint(1, 28)),
                cefr_level=None,
            )
        )
        students_kids.append(s)
    for i, name in enumerate(teen_first):
        s = await _create_user(db, _email(f"teen{i + 1}"), f"{name} {random.choice(surnames)}", UserRole.student)
        db.add(
            StudentProfile(
                user_id=s.id,
                birthdate=date(2010 - random.randint(0, 3), random.randint(1, 12), random.randint(1, 28)),
                cefr_level=None,
            )
        )
        students_teens.append(s)
    for i, name in enumerate(adult_first):
        s = await _create_user(db, _email(f"adult{i + 1}"), f"{name} {random.choice(surnames)}", UserRole.student)
        db.add(
            StudentProfile(
                user_id=s.id,
                birthdate=date(1995 - random.randint(0, 20), random.randint(1, 12), random.randint(1, 28)),
                cefr_level=None,
            )
        )
        students_adults.append(s)
    await db.flush()

    # ── Parents linked to kids/teens ───────────────────────────────────────
    parents: list[User] = []
    for i in range(8):
        p = await _create_user(db, _email(f"parent{i + 1}"), f"Родитель {i + 1}", UserRole.parent)
        parents.append(p)
    await db.flush()

    minors = students_kids + students_teens
    for parent in parents:
        # link 1-2 kids to each parent
        for child in random.sample(minors, k=random.randint(1, 2)):
            db.add(
                ParentLink(
                    parent_user_id=parent.id,
                    student_user_id=child.id,
                    relation="parent",
                    is_primary_contact=True,
                    consent_signed_at=datetime.now(UTC) - timedelta(days=60),
                )
            )

    # ── Groups ─────────────────────────────────────────────────────────────
    today = date.today()
    start = today - timedelta(days=14)  # started 2 weeks ago

    group_specs: list[tuple[str, Course, Branch, User, GroupMode, list[tuple[int, time]]]] = [
        # (label, course, branch, teacher, mode, slots [(weekday, start_time)])
        ("EN-B1-adults-mitino", courses[0], b_mitino, teachers[0], GroupMode.offline, [(0, time(19, 0)), (2, time(19, 0))]),
        ("EN-A2-adults-kutuzov", courses[1], b_kutuzov, teachers[1], GroupMode.hybrid, [(1, time(18, 30)), (3, time(18, 30))]),
        ("EN-B1-teens-mitino", courses[2], b_mitino, teachers[2], GroupMode.offline, [(0, time(17, 0)), (2, time(17, 0))]),
        ("EN-A1-kids-vladimir", courses[3], b_vladimir, teachers[3], GroupMode.offline, [(1, time(16, 30)), (3, time(16, 30))]),
        ("DE-A2-adults-online", courses[4], None, teachers[4], GroupMode.online, [(2, time(20, 0))]),
        ("FR-A1-adults-kutuzov", courses[5], b_kutuzov, teachers[0], GroupMode.offline, [(4, time(19, 0))]),
    ]
    groups: list[Group] = []
    for _label, course, branch, teacher, mode, slots in group_specs:
        g = Group(
            course_id=course.id,
            branch_id=branch.id if branch else None,
            teacher_id=teacher.id,
            mode=mode,
            start_date=start,
            end_date=start + timedelta(weeks=16),
            max_students=12,
            status=GroupStatus.active,
        )
        db.add(g)
        await db.flush()
        for weekday, start_time in slots:
            end_time = (datetime.combine(date.today(), start_time) + timedelta(minutes=80)).time()
            db.add(
                ScheduleSlot(
                    group_id=g.id,
                    weekday=weekday,
                    start_time=start_time,
                    end_time=end_time,
                    valid_from=start,
                    valid_to=start + timedelta(weeks=16),
                )
            )
        groups.append(g)

    # ── Enrollments — distribute students by age group ─────────────────────
    pools: dict[int, list[User]] = {
        0: students_adults,  # EN B1 adults
        1: students_adults,  # EN A2 adults
        2: students_teens,   # EN B1 teens
        3: students_kids,    # EN A1 kids
        4: students_adults,  # DE A2 adults
        5: students_adults,  # FR A1 adults
    }
    enrolled_students_by_group: dict[UUID, list[User]] = {}
    for idx, group in enumerate(groups):
        pool = pools[idx]
        chosen = random.sample(pool, k=min(len(pool), random.randint(5, 8)))
        enrolled_students_by_group[group.id] = chosen
        for s in chosen:
            db.add(
                Enrollment(
                    student_id=s.id,
                    group_id=group.id,
                    enrolled_at=datetime.combine(start, time(10, 0), tzinfo=UTC),
                )
            )

    await db.flush()

    # ── Lessons (past + future), attendance for past, journal closed ───────
    weeks_past = 2
    weeks_future = 4

    for group in groups:
        slots_res = await db.execute(select(ScheduleSlot).where(ScheduleSlot.group_id == group.id))
        slots = list(slots_res.scalars().all())
        seq = 0
        for week in range(-weeks_past, weeks_future):
            week_start = start + timedelta(weeks=week + weeks_past)
            for slot in slots:
                seq += 1
                lesson_date = week_start + timedelta(days=(slot.weekday - week_start.weekday()) % 7)
                scheduled = datetime.combine(lesson_date, slot.start_time, tzinfo=UTC)
                lesson = LessonInstance(
                    group_id=group.id,
                    sequence=seq,
                    title=f"Lesson {seq}",
                    scheduled_at=scheduled,
                    duration_min=80,
                    status=LessonStatus.planned,
                )
                if scheduled < datetime.now(UTC):
                    lesson.actual_started_at = scheduled
                    lesson.actual_ended_at = scheduled + timedelta(minutes=80)
                    lesson.status = LessonStatus.finished
                db.add(lesson)
                await db.flush()

                if lesson.status == LessonStatus.finished:
                    for student in enrolled_students_by_group[group.id]:
                        # ~85% present, 5% late, 7% absent, 3% excused
                        roll = random.random()
                        if roll < 0.85:
                            st = AttendanceStatus.present
                            score = random.randint(3, 5)
                        elif roll < 0.90:
                            st = AttendanceStatus.late
                            score = random.randint(2, 4)
                        elif roll < 0.97:
                            st = AttendanceStatus.absent
                            score = None
                        else:
                            st = AttendanceStatus.excused
                            score = None
                        db.add(
                            Attendance(
                                lesson_instance_id=lesson.id,
                                student_id=student.id,
                                status=st,
                                participation_score=score,
                                recorded_by=group.teacher_id,
                            )
                        )

                    # One assignment per past lesson, mostly already submitted/graded
                    a = Assignment(
                        lesson_instance_id=lesson.id,
                        title=f"Homework after {lesson.title}",
                        kind=random.choice(
                            [AssignmentKind.quiz, AssignmentKind.writing, AssignmentKind.reading]
                        ),
                        instructions="Выполните задание до следующего урока.",
                        due_at=scheduled + timedelta(days=2),
                        max_score=10,
                        auto_check=False,
                    )
                    db.add(a)
                    await db.flush()
                    for student in enrolled_students_by_group[group.id]:
                        roll = random.random()
                        if roll < 0.65:
                            sub = Submission(
                                assignment_id=a.id,
                                student_id=student.id,
                                attempt_no=1,
                                payload={"answer": "Sample answer text for demo purposes."},
                                status=SubmissionStatus.graded,
                                submitted_at=scheduled + timedelta(days=1),
                                score=random.randint(6, 10),
                                feedback="Хорошая работа, обрати внимание на Past Perfect.",
                                graded_by=group.teacher_id,
                                graded_at=scheduled + timedelta(days=2),
                            )
                            db.add(sub)
                        elif roll < 0.85:
                            sub = Submission(
                                assignment_id=a.id,
                                student_id=student.id,
                                attempt_no=1,
                                payload={"answer": "Draft."},
                                status=SubmissionStatus.submitted,
                                submitted_at=scheduled + timedelta(days=1, hours=12),
                            )
                            db.add(sub)
                        # else: not submitted

    # ── Pricing plans + subscriptions ──────────────────────────────────────
    plans = [
        PricingPlan(
            name="8 уроков",
            kind=PricingPlanKind.package,
            lessons_included=8,
            price_minor=8800_00,
            currency="RUB",
        ),
        PricingPlan(
            name="16 уроков",
            kind=PricingPlanKind.package,
            lessons_included=16,
            price_minor=16800_00,
            currency="RUB",
        ),
        PricingPlan(
            name="32 урока (квартал)",
            kind=PricingPlanKind.subscription,
            lessons_included=32,
            price_minor=32000_00,
            currency="RUB",
        ),
    ]
    db.add_all(plans)
    await db.flush()

    all_students = students_kids + students_teens + students_adults
    for student in all_students:
        plan = random.choice(plans)
        # Payment first
        payment = Payment(
            student_id=student.id,
            amount_minor=plan.price_minor,
            currency=plan.currency,
            provider="manual",
            provider_ref=f"demo-{student.id.hex[:8]}",
            idempotency_key=f"seed-{student.id.hex[:12]}",
            status=PaymentStatus.succeeded,
            paid_at=datetime.now(UTC) - timedelta(days=20),
        )
        db.add(payment)
        await db.flush()

        sub = Subscription(
            student_id=student.id,
            pricing_plan_id=plan.id,
            started_at=datetime.now(UTC) - timedelta(days=20),
            expires_at=datetime.now(UTC) + timedelta(days=70),
            lessons_remaining=plan.lessons_included - random.randint(0, 5),
            status=SubscriptionStatus.active,
        )
        db.add(sub)
        await db.flush()
        payment.subscription_id = sub.id

        # Top-up entry
        db.add(
            LessonCreditLedger(
                subscription_id=sub.id,
                payment_id=payment.id,
                delta=plan.lessons_included,
                reason=LedgerReason.purchase,
            )
        )
        # A few debits to match attended past lessons (rough)
        for _ in range(min(plan.lessons_included - sub.lessons_remaining, 8)):
            db.add(
                LessonCreditLedger(
                    subscription_id=sub.id,
                    delta=-1,
                    reason=LedgerReason.lesson_debit,
                )
            )

    # ── Notifications: a few greetings + a reminder per student ────────────
    for student in all_students[:20]:
        db.add(
            NotificationOutbox(
                user_id=student.id,
                channel=NotificationChannel.in_app,
                template_code="welcome",
                subject="Добро пожаловать в YES LMS!",
                body="Здравствуйте! Вы успешно зачислены. Расписание и материалы — в личном кабинете.",
                scheduled_at=datetime.now(UTC) - timedelta(days=14),
                sent_at=datetime.now(UTC) - timedelta(days=14),
                status=NotificationStatus.delivered,
            )
        )
        db.add(
            NotificationOutbox(
                user_id=student.id,
                channel=NotificationChannel.in_app,
                template_code="lesson_reminder",
                subject="Напоминание об уроке",
                body="Завтра у вас урок в 19:00. Не забудьте материалы.",
                scheduled_at=datetime.now(UTC) - timedelta(hours=4),
                sent_at=datetime.now(UTC) - timedelta(hours=4),
                status=NotificationStatus.delivered,
            )
        )

    await db.commit()
    logger.warning(
        "seed_completed",
        password=DEMO_PASSWORD,
        sample_emails=[
            _email("teacher_maria"),
            _email("methodist1"),
            _email("manager1"),
            _email("parent1"),
            _email("adult1"),
            _email("teen1"),
            _email("kid1"),
        ],
    )


def main() -> None:
    async def _run() -> None:
        async with SessionLocal() as db:
            await seed(db)

    asyncio.run(_run())


if __name__ == "__main__":
    main()
