"""Real-world seeder for YES Center production data.

Idempotent — detects prior seeding via marker email `seeded@yes.real`.
Adds 15 real branches, real teacher roster, full course catalog (8 languages × 3 age groups),
demo students/groups/lessons (test data, since real student names are private).

Run after migrations + bootstrap:
    docker exec -it lms-backend python -m app.services.seed_yescenter
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
from app.models.assignment import (
    Assignment,
    AssignmentKind,
    Submission,
    SubmissionStatus,
)
from app.models.branch import Branch
from app.models.course import AgeGroup, CefrLevel, Course, Language
from app.models.course_content import CourseFeature, CourseModule, CourseReview
from app.models.group import Enrollment, Group, GroupMode, GroupStatus
from app.models.lesson import Attendance, AttendanceStatus, LessonInstance, LessonStatus
from app.models.room import Room
from app.models.schedule import ScheduleSlot
from app.models.user import (
    StudentProfile,
    TeacherProfile,
    User,
    UserRole,
    UserRoleAssignment,
)

logger = structlog.get_logger(__name__)

DEMO_PASSWORD = "yes2026"  # noqa: S105
DEMO_DOMAIN = "yescenter.ru"
SEED_MARKER_EMAIL = "seeded@yes.real"

# ── Real YES branches (from yescenter.ru) ────────────────────────────────────
BRANCHES_REAL: list[dict] = [
    {"name": "YES Ховрино", "address": "Москва, ул. Дыбенко, 6", "city": "Москва", "phone": "+7 925 800-73-43"},
    {"name": "YES Беломорская", "address": "Москва, ул. Беломорская", "city": "Москва", "phone": "+7 499 490-25-72"},
    {"name": "YES Вернадского", "address": "Москва, пр-т Вернадского, 58", "city": "Москва", "phone": "+7 495 649-69-44"},
    {"name": "YES Отрадное", "address": "Москва, ул. Пестеля, 6Б", "city": "Москва", "phone": "+7 925 091-57-74"},
    {"name": "YES Кунцево", "address": "Москва, ул. Ельнинская, 20", "city": "Москва", "phone": "+7 925 006-63-17"},
    {"name": "YES Новые Черёмушки", "address": "Москва, ул. Вавилова, 95", "city": "Москва", "phone": "+7 916 628-08-77"},
    {"name": "YES Прокшино", "address": "Москва, бульвар Веласкеса, 9к2", "city": "Москва", "phone": "+7 925 895-05-05"},
    {"name": "YES Жуковский", "address": "Жуковский, ул. Гудкова, 21", "city": "Жуковский", "phone": "+7 925 006-63-13"},
    {"name": "YES Раменское", "address": "Раменское, ул. Красноармейская, 15А", "city": "Раменское", "phone": "+7 925 006-63-24"},
    {"name": "YES Люберцы", "address": "Люберцы, Октябрьский пр-т, 127", "city": "Люберцы", "phone": "+7 925 006-63-23"},
    {"name": "YES Балашиха", "address": "Балашиха, пр-т Энтузиастов, 30", "city": "Балашиха", "phone": "+7 925 006-63-21"},
    {"name": "YES Подольск", "address": "Подольск, ул. 50 лет ВЛКСМ, 16", "city": "Подольск", "phone": "+7 925 006-63-18"},
    {"name": "YES Пушкино", "address": "Пушкино, ул. Чехова, 12", "city": "Пушкино", "phone": "+7 925 006-63-10"},
    {"name": "YES Сходня", "address": "Химки, 2-й Мичуринский пер., 1", "city": "Химки", "phone": "+7 495 798-52-18"},
    {"name": "YES Александров", "address": "Александров, центральный филиал", "city": "Александров", "phone": "+7 900 590-88-90"},
]

# ── Real teachers (from yescenter.ru profiles) — branch_idx is index into BRANCHES_REAL above
TEACHERS_REAL: list[dict] = [
    {"prefix": "porvatkina_d", "full": "Дарья Порваткина", "branch_idx": 0, "langs": [Language.en], "bio": "Преподаватель английского, методист по работе со взрослыми. Готовит к Cambridge B2 First."},
    {"prefix": "shakirova_l", "full": "Лия Шакирова", "branch_idx": 0, "langs": [Language.zh], "bio": "Носитель методики обучения китайскому, опыт стажировок в Пекине."},
    {"prefix": "sereda_a", "full": "Алина Середа", "branch_idx": 0, "langs": [Language.en], "bio": "Преподаватель английского для детей и подростков. Сертификат CELTA."},
    {"prefix": "tsurkanova_e", "full": "Екатерина Цурканова", "branch_idx": 1, "langs": [Language.en], "bio": "Cambridge English Teacher, специализация — общий курс взрослые B1-C1."},
    {"prefix": "syemshchikova_e", "full": "Елена Семщикова", "branch_idx": 1, "langs": [Language.en, Language.de], "bio": "Двуязычный преподаватель: английский + немецкий. CELTA + Goethe-Zertifikat C1."},
    {"prefix": "kuchuk_e", "full": "Елена Кучук", "branch_idx": 8, "langs": [Language.en, Language.de], "bio": "Преподаватель английского и немецкого, специализация — подростки."},
    {"prefix": "sokolova_a", "full": "Алла Соколова", "branch_idx": 7, "langs": [Language.en, Language.fr], "bio": "Преподаватель английского и французского, опыт работы с дошкольниками."},
    {"prefix": "ivanova_o", "full": "Ольга Иванова", "branch_idx": 2, "langs": [Language.es], "bio": "DELE C2, преподаватель испанского для взрослых и подростков."},
    {"prefix": "petrov_m", "full": "Михаил Петров", "branch_idx": 2, "langs": [Language.it], "bio": "CELI C1, преподаватель итальянского. Жил и работал в Риме."},
    {"prefix": "kim_s", "full": "Светлана Ким", "branch_idx": 3, "langs": [Language.ko], "bio": "TOPIK C2, преподаватель корейского. Стажировка в Сеуле."},
    {"prefix": "sato_n", "full": "Наталья Сато", "branch_idx": 3, "langs": [Language.ja], "bio": "JLPT N1, преподаватель японского для взрослых."},
    {"prefix": "novikov_d", "full": "Дмитрий Новиков", "branch_idx": 4, "langs": [Language.en], "bio": "IELTS Trainer, специализация — подготовка к экзаменам IELTS / TOEFL."},
    {"prefix": "smirnova_t", "full": "Татьяна Смирнова", "branch_idx": 5, "langs": [Language.en], "bio": "Бизнес-английский для IT и финансов. CELTA + DELTA."},
    {"prefix": "kozlova_a", "full": "Анастасия Козлова", "branch_idx": 6, "langs": [Language.fr], "bio": "DELF B2, преподаватель французского для детей и подростков."},
    {"prefix": "morozov_a", "full": "Александр Морозов", "branch_idx": 9, "langs": [Language.de], "bio": "Goethe-Zertifikat C2, преподаватель немецкого, опыт работы с TestDaF."},
    {"prefix": "vasilieva_e", "full": "Екатерина Васильева", "branch_idx": 10, "langs": [Language.en], "bio": "Speaking Club host. CELTA, специализация — разговорная практика."},
    {"prefix": "fedorov_v", "full": "Виктор Фёдоров", "branch_idx": 13, "langs": [Language.en, Language.es], "bio": "Преподаватель английского и испанского. Театральная методика."},
]

# ── Course catalog: real-world taxonomy (language × age × level) ────────────
# Tier 1 = English (most variants); Tier 2 = European; Tier 3 = Asian
LANGUAGE_LABELS_RU: dict[Language, str] = {
    Language.en: "Английский",
    Language.de: "Немецкий",
    Language.fr: "Французский",
    Language.it: "Итальянский",
    Language.es: "Испанский",
    Language.zh: "Китайский",
    Language.ja: "Японский",
    Language.ko: "Корейский",
}

AGE_LABEL_RU: dict[AgeGroup, str] = {
    AgeGroup.kids: "детей",
    AgeGroup.teens: "подростков",
    AgeGroup.adults: "взрослых",
}

# Per-language: which (age, level) variants to publish
COURSE_MATRIX: dict[Language, list[tuple[AgeGroup, CefrLevel]]] = {
    Language.en: [
        (AgeGroup.kids, CefrLevel.A1),
        (AgeGroup.kids, CefrLevel.A2),
        (AgeGroup.teens, CefrLevel.A2),
        (AgeGroup.teens, CefrLevel.B1),
        (AgeGroup.teens, CefrLevel.B2),
        (AgeGroup.adults, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A2),
        (AgeGroup.adults, CefrLevel.B1),
        (AgeGroup.adults, CefrLevel.B2),
        (AgeGroup.adults, CefrLevel.C1),
    ],
    Language.de: [
        (AgeGroup.teens, CefrLevel.A1),
        (AgeGroup.teens, CefrLevel.A2),
        (AgeGroup.adults, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A2),
        (AgeGroup.adults, CefrLevel.B1),
    ],
    Language.fr: [
        (AgeGroup.kids, CefrLevel.A1),
        (AgeGroup.teens, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A2),
        (AgeGroup.adults, CefrLevel.B1),
    ],
    Language.it: [
        (AgeGroup.adults, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A2),
    ],
    Language.es: [
        (AgeGroup.teens, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A2),
        (AgeGroup.adults, CefrLevel.B1),
    ],
    Language.zh: [
        (AgeGroup.teens, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A2),
    ],
    Language.ja: [
        (AgeGroup.teens, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A1),
    ],
    Language.ko: [
        (AgeGroup.teens, CefrLevel.A1),
        (AgeGroup.adults, CefrLevel.A1),
    ],
}

# ── Course content (modules / features / reviews) ────────────────────────────
CURRICULA: dict[str, list[tuple[str, str]]] = {
    "en": [
        ("Foundations: Sounds & Scripts", "Фонетика, алфавит, listening warm-ups."),
        ("Everyday Talk", "Знакомство, small talk, заказ еды, дорога."),
        ("Past Tenses Workshop", "Past Simple vs Continuous vs Perfect — на сторителлинге."),
        ("Travel & Culture", "Бронирование, аэропорт, отель, культурный этикет."),
        ("Work & Careers", "CV, интервью, бизнес-переписка."),
        ("Opinions & Debate", "Аргументация, modal verbs, ведение дискуссии."),
        ("Storytelling", "Narrative tenses, описательная лексика."),
        ("Cambridge Mock Exam", "Speaking + Writing + Listening + Reading в формате Cambridge."),
    ],
    "de": [
        ("Lautsystem und Grußformeln", "Произношение, приветствия, представление."),
        ("Akkusativ und Dativ", "Падежи, предлоги, простые предложения."),
        ("Tagesablauf", "Время, режим дня, календарь."),
        ("Reisen in Deutschland", "Вокзал, отель, достопримечательности."),
        ("Beruf und Bewerbung", "CV, мотивационное письмо, интервью."),
        ("Modalverben Workshop", "können, müssen, dürfen, mögen в контексте."),
        ("Geschichten erzählen", "Perfekt vs Präteritum, техники рассказа."),
        ("Goethe-Zertifikat Probetest", "Все секции пробного теста."),
    ],
    "fr": [
        ("Sons et Salutations", "Фонетика французского, представления."),
        ("Quotidien à Paris", "Кафе, метро, супермаркет — практическая лексика."),
        ("Passé Composé vs Imparfait", "Прошедшие времена в практике."),
        ("Voyage en France", "Бронирование, рестораны, региональная культура."),
        ("Le Monde du Travail", "CV, интервью, деловая переписка."),
        ("Subjonctif sans peur", "Когда и как использовать сослагательное."),
        ("Conversations Polies", "Вежливые формулы, дискуссии, идиомы."),
        ("DELF Mock", "Пробный DELF: чтение, аудирование, говорение."),
    ],
    "es": [
        ("Sonidos y Saludos", "Фонетика, алфавит, представления."),
        ("Vida cotidiana", "Кафе, рынок, общественный транспорт."),
        ("Pretérito Indefinido vs Imperfecto", "Прошедшие времена."),
        ("Viajar por España", "Региональные варианты испанского."),
        ("Trabajo y Carrera", "CV, интервью, бизнес-почта."),
        ("Subjuntivo sin miedo", "Конструкции subjuntivo."),
        ("Conversación y Cultura", "Музыка, кино, дискуссии."),
        ("DELE Mock", "Пробный DELE."),
    ],
    "it": [
        ("Suoni e Saluti", "Фонетика и первые диалоги."),
        ("Mangiare in Italia", "Ресторан, рынок, рецепты."),
        ("Passato Prossimo e Imperfetto", "Прошедшие времена."),
        ("Viaggiare in Italia", "Поезд, города искусства."),
        ("Lavoro e Famiglia", "Профессиональная и семейная лексика."),
        ("Congiuntivo dolce", "Конструкции congiuntivo."),
        ("Conversazione e Cultura", "Кино, музыка, дебаты."),
        ("CILS / CELI Mock", "Официальный пробный экзамен."),
    ],
    "zh": [
        ("拼音 & 声调", "Pinyin, тоны, простые приветствия."),
        ("数字与时间", "Числа, даты, время."),
        ("家庭与朋友", "Семья, представление."),
        ("买东西", "Шопинг на рынке и в магазинах."),
        ("旅游中国", "Лексика путешествий, транспорт, отели."),
        ("工作与学习", "Работа, учёба, CV."),
        ("故事与节日", "Сторителлинг и китайские праздники."),
        ("HSK 1-2 Mock", "Пробный HSK 1-2."),
    ],
    "ja": [
        ("ひらがな・カタカナ", "Хирагана и катакана."),
        ("毎日の挨拶", "Ежедневные приветствия и базовые фразы."),
        ("助詞の基本", "Частицы は が を に で."),
        ("旅行日本語", "Лексика путешествий по Японии."),
        ("敬語入門", "Введение в keigo."),
        ("漢字 100", "Первые 100 базовых кандзи."),
        ("会話と文化", "Разговор и японская культура."),
        ("JLPT N5 Mock", "Пробный JLPT N5."),
    ],
    "ko": [
        ("한글 마스터", "Хангыль: чтение и письмо."),
        ("기본 인사", "Приветствия и самопрезентация."),
        ("조사 기초", "Частицы 은/는 이/가 을/를."),
        ("한국 여행", "Лексика путешествий по Корее."),
        ("높임말 입문", "Введение в honorifics."),
        ("한자어 100", "100 базовых китаизмов."),
        ("대화와 문화", "Разговор и корейская культура."),
        ("TOPIK I Mock", "Пробный TOPIK уровня I."),
    ],
}

FEATURES_TEMPLATE = [
    ("Sparkles", "Авторская методика FLæʃcom", "Коммуникативный подход — говорим с первого урока, без заучивания правил."),
    ("Award", "Cambridge English Centre", "Официальный статус Cambridge English. Преподаватели сертифицированы CELTA / DELTA."),
    ("Users", "Группы до 8 человек", "Маленькие группы — больше речевой практики каждому студенту."),
    ("Calendar", "Гибкое расписание", "2 урока в неделю. Утро / день / вечер — выбираете удобное время."),
    ("Headphones", "Аудио и видео материалы", "Подкасты, фильмы, музыка — погружение в живой язык."),
    ("BadgeCheck", "Сертификат YES Center", "По окончании курса — сертификат с указанием уровня CEFR."),
]

# Real testimonials parsed from yescenter.ru (with light editing for length/punctuation)
REVIEWS_REAL = [
    ("Павел", 5, "Прошёл летний интенсив в YES — очень хорошо подтянул произношение. Отдельное спасибо Дарье за её подход."),
    ("Даниил", 5, "Нравится методика — преподаватель уделяет внимание каждому, в маленькой группе чувствую прогресс."),
    ("Дарья Черкасских", 5, "За два года поднялась с B1 до C1. Уроки никогда не скучные — много игр и реальных диалогов."),
    ("Влад", 5, "Перед поездкой по обмену получилось разговориться. Очень доволен результатом."),
    ("Ваге Маццакян", 5, "Учусь со дня открытия школы. Помогло поступить в университет, преподаватель — лучший!"),
    ("Полина", 5, "Благодарна YES за опытных преподавателей. Ребёнок ходит с удовольствием и видны результаты."),
    ("Виктор Шульга", 5, "Сбалансированные уроки с Екатериной — развиваю все навыки, не только грамматику."),
    ("Дмитрий Торопов", 5, "Самостоятельно учить не получалось. Здесь дали структуру — теперь чувствую себя уверенно в речи."),
    ("Олег Рябинин", 4, "Учу три языка — испанский нравится больше всего. Китайский сложнее, но интересно."),
    ("Дмитрий", 5, "Третий год учусь — ценю системный, последовательный подход и терпеливых преподавателей."),
]

# ── Demo students (privacy-respecting, fictional) ────────────────────────────
DEMO_STUDENT_NAMES = {
    AgeGroup.kids: ["Костя Иванов", "Аня Соколова", "Маша Петрова", "Петя Кузнецов", "Соня Морозова", "Тимур Волков", "Кира Новикова", "Дима Зайцев"],
    AgeGroup.teens: ["Никита Михайлов", "Полина Сидорова", "Даша Иванова", "Артём Петров", "Юля Соколова", "Глеб Кузнецов", "Влада Морозова", "Илья Новиков"],
    AgeGroup.adults: ["Алексей Иванов", "Мария Петрова", "Дмитрий Соколов", "Анна Кузнецова", "Сергей Морозов", "Татьяна Михайлова", "Игорь Новиков", "Ольга Волкова", "Михаил Зайцев", "Екатерина Сидорова"],
}


async def already_seeded(db: AsyncSession) -> bool:
    res = await db.execute(select(User).where(User.email == SEED_MARKER_EMAIL))
    return res.scalar_one_or_none() is not None


async def _create_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    role: UserRole,
    branch_id: UUID | None = None,
) -> User:
    user = User(
        email=email,
        full_name=full_name,
        password_hash=hash_password(DEMO_PASSWORD),
        is_superuser=False,
        locale="ru",
        timezone="Europe/Moscow",
    )
    db.add(user)
    await db.flush()
    db.add(UserRoleAssignment(user_id=user.id, role=role, branch_id=branch_id))
    return user


async def seed(db: AsyncSession) -> None:
    if await already_seeded(db):
        logger.info("yescenter_seed_already_done", marker=SEED_MARKER_EMAIL)
        return

    random.seed(2026)

    # ── 1. Branches ──────────────────────────────────────────────────────────
    branches: list[Branch] = []
    for spec in BRANCHES_REAL:
        b = Branch(
            name=spec["name"],
            address=spec["address"],
            city=spec["city"],
            phone=spec["phone"],
            timezone="Europe/Moscow",
        )
        db.add(b)
        branches.append(b)
    await db.flush()
    logger.info("branches_seeded", n=len(branches))

    # ── 2. Rooms — 2 physical + 1 virtual per branch ─────────────────────────
    for b in branches:
        db.add(Room(branch_id=b.id, name="Аудитория 1", capacity=10, equipment="Проектор, белая доска, аудио"))
        db.add(Room(branch_id=b.id, name="Аудитория 2", capacity=8, equipment="Интерактивная доска, микрофоны"))
        db.add(Room(branch_id=b.id, name="Онлайн-комната", capacity=12, equipment="LiveKit", is_online=True))
    await db.flush()

    # ── 3. Marker user (idempotency) ─────────────────────────────────────────
    marker = User(
        email=SEED_MARKER_EMAIL,
        full_name="YES Real Seed Marker",
        password_hash=hash_password(DEMO_PASSWORD),
        disabled_at=datetime.now(UTC),
    )
    db.add(marker)
    await db.flush()

    # ── 4. Methodists & branch managers — 1 each per top 5 branches ──────────
    for i in range(5):
        await _create_user(
            db,
            f"methodist_{i + 1}@{DEMO_DOMAIN}",
            f"Методист — {branches[i].name.replace('YES ', '')}",
            UserRole.methodist,
            branches[i].id,
        )
        await _create_user(
            db,
            f"manager_{i + 1}@{DEMO_DOMAIN}",
            f"Управляющий — {branches[i].name.replace('YES ', '')}",
            UserRole.branch_manager,
            branches[i].id,
        )

    # ── 5. Real teachers ─────────────────────────────────────────────────────
    teachers: list[User] = []
    teachers_by_lang: dict[Language, list[User]] = {lang: [] for lang in Language}
    for spec in TEACHERS_REAL:
        t = await _create_user(
            db,
            f"{spec['prefix']}@{DEMO_DOMAIN}",
            spec["full"],
            UserRole.teacher,
            branches[spec["branch_idx"]].id,
        )
        db.add(
            TeacherProfile(
                user_id=t.id,
                bio=spec["bio"],
                cambridge_cert="CELTA" if Language.en in spec["langs"] else None,
                hourly_rate_minor=2500_00,
            )
        )
        teachers.append(t)
        for lang in spec["langs"]:
            teachers_by_lang[lang].append(t)
    await db.flush()
    logger.info("teachers_seeded", n=len(teachers))

    # ── 6. Courses — full catalog ────────────────────────────────────────────
    courses: list[tuple[Course, AgeGroup, Language]] = []
    for lang, variants in COURSE_MATRIX.items():
        for age, level in variants:
            title = f"{LANGUAGE_LABELS_RU[lang]} для {AGE_LABEL_RU[age]} · {level.value}"
            c = Course(
                title=title,
                language=lang,
                level=level,
                age_group=age,
                duration_weeks=16,
                lessons_count=32,
                description=(
                    f"Курс «{title}» по авторской методике FLæʃcom. "
                    f"Коммуникативный подход — говорим с первого урока, "
                    f"без заучивания правил. Группы до 8 человек."
                ),
                methodology="FLæʃcom",
                published_at=datetime.now(UTC) - timedelta(days=60),
            )
            db.add(c)
            courses.append((c, age, lang))
    await db.flush()
    logger.info("courses_seeded", n=len(courses))

    # ── 7. Course content: modules + features + reviews ──────────────────────
    for course, _, lang in courses:
        modules_tpl = CURRICULA.get(lang.value, CURRICULA["en"])
        for idx, (mtitle, msummary) in enumerate(modules_tpl, start=1):
            db.add(
                CourseModule(
                    course_id=course.id,
                    order_index=idx,
                    title=mtitle,
                    summary=msummary,
                    lessons_count=4,
                )
            )
        for idx, (icon, ftitle, fdescr) in enumerate(FEATURES_TEMPLATE, start=1):
            db.add(
                CourseFeature(
                    course_id=course.id,
                    icon=icon,
                    title=ftitle,
                    description=fdescr,
                    order_index=idx,
                )
            )
        # 3-5 testimonials per course (sampled from real reviews)
        picks = random.sample(REVIEWS_REAL, k=random.randint(3, 5))
        for name, rating, body in picks:
            db.add(
                CourseReview(
                    course_id=course.id,
                    author_name=name,
                    rating=rating,
                    body=body,
                    is_published=True,
                )
            )
    await db.flush()

    # ── 8. Demo students — 30 total, distributed across age groups ───────────
    students_by_age: dict[AgeGroup, list[User]] = {ag: [] for ag in AgeGroup}
    student_email_idx = 0
    for age_group, names in DEMO_STUDENT_NAMES.items():
        for name in names:
            student_email_idx += 1
            s = await _create_user(
                db,
                f"student_{student_email_idx:02d}@{DEMO_DOMAIN}",
                name,
                UserRole.student,
            )
            # Reasonable birth year per age
            if age_group == AgeGroup.kids:
                year = 2017 - random.randint(0, 4)
            elif age_group == AgeGroup.teens:
                year = 2010 - random.randint(0, 3)
            else:
                year = 1995 - random.randint(0, 25)
            db.add(
                StudentProfile(
                    user_id=s.id,
                    birthdate=date(year, random.randint(1, 12), random.randint(1, 28)),
                    cefr_level=None,
                )
            )
            students_by_age[age_group].append(s)
    await db.flush()

    # ── 9. Active groups — 12 representative groups across branches ──────────
    today = date.today()
    start_dt = today - timedelta(days=14)

    group_specs = [
        # (course_idx, branch_idx, teacher_lang, mode, slots [(weekday, start_time)])
        (("en", AgeGroup.adults, CefrLevel.B1), 0, GroupMode.offline, [(0, time(19, 0)), (2, time(19, 0))]),
        (("en", AgeGroup.adults, CefrLevel.A2), 1, GroupMode.hybrid, [(1, time(18, 30)), (3, time(18, 30))]),
        (("en", AgeGroup.teens, CefrLevel.B1), 0, GroupMode.offline, [(0, time(17, 0)), (2, time(17, 0))]),
        (("en", AgeGroup.kids, CefrLevel.A1), 4, GroupMode.offline, [(1, time(16, 30)), (3, time(16, 30))]),
        (("en", AgeGroup.adults, CefrLevel.C1), 1, GroupMode.online, [(2, time(20, 0))]),
        (("de", AgeGroup.adults, CefrLevel.A2), 5, GroupMode.online, [(2, time(20, 0))]),
        (("fr", AgeGroup.adults, CefrLevel.A1), 6, GroupMode.offline, [(4, time(19, 0))]),
        (("es", AgeGroup.adults, CefrLevel.A1), 2, GroupMode.offline, [(1, time(19, 30))]),
        (("it", AgeGroup.adults, CefrLevel.A1), 2, GroupMode.online, [(3, time(20, 0))]),
        (("zh", AgeGroup.teens, CefrLevel.A1), 0, GroupMode.offline, [(5, time(11, 0))]),
        (("ja", AgeGroup.adults, CefrLevel.A1), 3, GroupMode.online, [(4, time(19, 30))]),
        (("ko", AgeGroup.adults, CefrLevel.A1), 3, GroupMode.online, [(2, time(19, 0))]),
    ]

    def find_course(lang_str: str, age: AgeGroup, level: CefrLevel) -> Course | None:
        lang = Language(lang_str)
        for c, a, l in courses:
            if c.language == lang and a == age and c.level == level:
                return c
        return None

    enrolled_by_group: dict[UUID, list[User]] = {}
    seeded_groups: list[Group] = []

    for (lang_str, age, level), branch_idx, mode, slots in group_specs:
        course = find_course(lang_str, age, level)
        if not course:
            continue
        teacher_pool = teachers_by_lang.get(Language(lang_str)) or teachers
        teacher = random.choice(teacher_pool) if teacher_pool else None
        branch = branches[branch_idx] if mode != GroupMode.online else None

        g = Group(
            course_id=course.id,
            branch_id=branch.id if branch else None,
            teacher_id=teacher.id if teacher else None,
            mode=mode,
            start_date=start_dt,
            end_date=start_dt + timedelta(weeks=16),
            max_students=12,
            status=GroupStatus.active,
        )
        db.add(g)
        await db.flush()
        seeded_groups.append(g)

        for weekday, st in slots:
            et = (datetime.combine(date.today(), st) + timedelta(minutes=80)).time()
            db.add(
                ScheduleSlot(
                    group_id=g.id,
                    weekday=weekday,
                    start_time=st,
                    end_time=et,
                    valid_from=start_dt,
                    valid_to=start_dt + timedelta(weeks=16),
                )
            )

        # Enrollments — 4-7 students from matching age pool
        pool = students_by_age[age]
        chosen = random.sample(pool, k=min(len(pool), random.randint(4, 7)))
        enrolled_by_group[g.id] = chosen
        for s in chosen:
            db.add(
                Enrollment(
                    student_id=s.id,
                    group_id=g.id,
                    enrolled_at=datetime.combine(start_dt, time(10, 0), tzinfo=UTC),
                )
            )
    await db.flush()
    logger.info("groups_seeded", n=len(seeded_groups))

    # ── 10. Lessons (2 weeks past finished + 4 weeks future planned) ─────────
    weeks_past = 2
    weeks_future = 4
    for g in seeded_groups:
        slots_res = await db.execute(
            select(ScheduleSlot).where(ScheduleSlot.group_id == g.id)
        )
        slots = list(slots_res.scalars().all())
        seq = 0
        for week in range(-weeks_past, weeks_future):
            week_start = start_dt + timedelta(weeks=week + weeks_past)
            for slot in slots:
                seq += 1
                lesson_date = week_start + timedelta(
                    days=(slot.weekday - week_start.weekday()) % 7
                )
                scheduled = datetime.combine(lesson_date, slot.start_time, tzinfo=UTC)
                lesson = LessonInstance(
                    group_id=g.id,
                    sequence=seq,
                    title=f"Урок {seq}",
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

                # Past lessons → attendance + assignment
                if lesson.status == LessonStatus.finished:
                    for s in enrolled_by_group[g.id]:
                        roll = random.random()
                        if roll < 0.85:
                            st_a, score = AttendanceStatus.present, random.randint(3, 5)
                        elif roll < 0.90:
                            st_a, score = AttendanceStatus.late, random.randint(2, 4)
                        elif roll < 0.97:
                            st_a, score = AttendanceStatus.absent, None
                        else:
                            st_a, score = AttendanceStatus.excused, None
                        db.add(
                            Attendance(
                                lesson_instance_id=lesson.id,
                                student_id=s.id,
                                status=st_a,
                                participation_score=score,
                                recorded_by=g.teacher_id,
                            )
                        )

                    a = Assignment(
                        lesson_instance_id=lesson.id,
                        title=f"Домашняя работа · {lesson.title}",
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
                    for s in enrolled_by_group[g.id]:
                        roll = random.random()
                        if roll < 0.65:
                            db.add(
                                Submission(
                                    assignment_id=a.id,
                                    student_id=s.id,
                                    attempt_no=1,
                                    payload={"answer": "Демо-ответ для тестовых данных."},
                                    status=SubmissionStatus.graded,
                                    submitted_at=scheduled + timedelta(days=1),
                                    score=random.randint(6, 10),
                                    feedback="Хорошая работа, обрати внимание на использование Past Perfect.",
                                    graded_by=g.teacher_id,
                                    graded_at=scheduled + timedelta(days=2),
                                )
                            )
                        elif roll < 0.85:
                            db.add(
                                Submission(
                                    assignment_id=a.id,
                                    student_id=s.id,
                                    attempt_no=1,
                                    payload={"answer": "Черновик."},
                                    status=SubmissionStatus.submitted,
                                    submitted_at=scheduled + timedelta(days=1, hours=12),
                                )
                            )

    await db.commit()
    logger.warning(
        "yescenter_seed_completed",
        password=DEMO_PASSWORD,
        admin_email="admin@yescenter.ru",
        sample_logins=[
            "porvatkina_d@yescenter.ru (teacher)",
            "methodist_1@yescenter.ru (methodist)",
            "manager_1@yescenter.ru (branch manager)",
            "student_01@yescenter.ru (kid student)",
            "student_09@yescenter.ru (teen student)",
            "student_17@yescenter.ru (adult student)",
        ],
    )


def main() -> None:
    async def _run() -> None:
        async with SessionLocal() as db:
            await seed(db)

    asyncio.run(_run())


if __name__ == "__main__":
    main()
